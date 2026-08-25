"""
AutoTrace Django Middleware — Client SDK
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Drop-in Django middleware that captures unhandled exceptions and reports
them to the AutoTrace ingestion API.

Quick start
-----------
1.  ``pip install autotrace``  (or add this package to your requirements)

2.  Add to your Django settings::

        MIDDLEWARE = [
            ...
            'autotrace.middleware.AutoTraceMiddleware',
        ]

        AUTOTRACE_DSN = "https://api.autotrace.io/ingest/"  # default
        AUTOTRACE_API_KEY = "<your-project-api-key>"

3.  That's it — unhandled 500s are now reported automatically.
"""

from __future__ import annotations

import json
import logging
import re
import traceback
from datetime import datetime, timezone
from typing import Any, Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse

try:
    import urllib.request
    import urllib.error

    _HAS_URLLIB = True
except ImportError:  # pragma: no cover — paranoia guard
    _HAS_URLLIB = False

logger = logging.getLogger("autotrace.middleware")

# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

# Default ingestion endpoint
_DEFAULT_DSN = "https://api.autotrace.io/ingest/"

# Maximum traceback frames forwarded (keeps payloads focused)
_MAX_TRACEBACK_FRAMES = 15

# Keys whose *values* will be masked in headers / body payloads.
# Matching is case-insensitive and checks whether the key *contains* the word.
_SENSITIVE_PATTERNS: re.Pattern[str] = re.compile(
    r"(password|secret|token|authorization)", re.IGNORECASE
)

_MASK = "********"


# ---------------------------------------------------------------------------
# Data scrubbing
# ---------------------------------------------------------------------------


def _is_sensitive_key(key: str) -> bool:
    """Return ``True`` if *key* looks like it holds a sensitive value."""
    return bool(_SENSITIVE_PATTERNS.search(key))


def _scrub(data: Any) -> Any:
    """Recursively walk *data* and mask values behind sensitive keys.

    Handles nested dicts and lists.  Everything else passes through
    unchanged.
    """
    if isinstance(data, dict):
        sanitised: dict[str, Any] = {}
        for key, value in data.items():
            if _is_sensitive_key(str(key)):
                sanitised[key] = _MASK
            else:
                sanitised[key] = _scrub(value)
        return sanitised

    if isinstance(data, (list, tuple)):
        return [_scrub(item) for item in data]

    return data


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------


def _extract_headers(request: HttpRequest) -> dict[str, str]:
    """Pull HTTP headers from ``request.META``, scrubbing sensitive ones."""
    headers: dict[str, str] = {}
    for meta_key, meta_value in request.META.items():
        if not meta_key.startswith("HTTP_"):
            continue
        # Convert META key (e.g. HTTP_ACCEPT_LANGUAGE) → header name
        header_name = meta_key[5:].replace("_", "-").title()
        if _is_sensitive_key(header_name):
            headers[header_name] = _MASK
        else:
            headers[header_name] = str(meta_value)
    return headers


def _extract_body(request: HttpRequest) -> dict[str, Any]:
    """Best-effort parse + scrub of the request body."""
    try:
        raw = request.body
        if not raw:
            return {}
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        # Body might be form-encoded, binary, or otherwise unparsable.
        # Wrap it as a raw string so we still capture *something*.
        try:
            payload = {"_raw": request.body.decode("utf-8", errors="replace")}
        except Exception:
            return {}

    return _scrub(payload)


def _extract_traceback(exc: BaseException) -> list[str]:
    """Return a compact, relevant traceback as a list of formatted lines.

    We limit output to ``_MAX_TRACEBACK_FRAMES`` innermost frames so that
    payloads stay small and focused on application code rather than deep
    framework internals.
    """
    tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
    # ``format_exception`` returns a list of multi-line strings; flatten.
    flat: list[str] = []
    for chunk in tb_lines:
        flat.extend(chunk.splitlines())

    # Keep only the tail (most relevant frames) + the final exception line.
    if len(flat) > _MAX_TRACEBACK_FRAMES:
        flat = ["... (truncated)"] + flat[-_MAX_TRACEBACK_FRAMES:]

    return flat


# ---------------------------------------------------------------------------
# Payload construction
# ---------------------------------------------------------------------------


def _build_payload(
    request: HttpRequest, exception: BaseException
) -> dict[str, Any]:
    """Assemble the JSON-serialisable error payload."""
    return {
        "exception": {
            "type": type(exception).__qualname__,
            "message": str(exception),
            "traceback": _extract_traceback(exception),
        },
        "request": {
            "method": request.method,
            "path": request.path,
            "query_string": request.META.get("QUERY_STRING", ""),
            "headers": _extract_headers(request),
            "body": _extract_body(request),
        },
        "server": {
            "server_name": request.META.get("SERVER_NAME", ""),
            "server_port": request.META.get("SERVER_PORT", ""),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sdk": {
            "name": "autotrace-python",
            "version": "0.1.0",
        },
    }


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------


def _send_payload(payload: dict[str, Any], dsn: str, api_key: str) -> None:
    """POST *payload* to the AutoTrace ingestion endpoint.

    Uses only the stdlib ``urllib`` so we avoid adding ``requests`` as a
    hard dependency for SDK consumers.

    This function is wrapped in a blanket ``try / except`` at the call
    site so that transport failures **never** propagate to the host app.
    """
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        dsn,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-AutoTrace-Key": api_key,
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=5)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------


class AutoTraceMiddleware:
    """Django middleware that reports unhandled exceptions to AutoTrace.

    Configuration is read from ``django.conf.settings``:

    ========================  ======================================
    Setting                   Description
    ========================  ======================================
    ``AUTOTRACE_DSN``         Ingestion URL (default: ``https://api.autotrace.io/ingest/``)
    ``AUTOTRACE_API_KEY``     Project API key (required)
    ``AUTOTRACE_ENABLED``     Kill-switch — set ``False`` to disable (default: ``True``)
    ========================  ======================================
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

        # Read configuration once at startup.
        self.dsn: str = getattr(settings, "AUTOTRACE_DSN", _DEFAULT_DSN)
        self.api_key: str = getattr(settings, "AUTOTRACE_API_KEY", "")
        self.enabled: bool = getattr(settings, "AUTOTRACE_ENABLED", True)

        if self.enabled and not self.api_key:
            logger.warning(
                "AutoTraceMiddleware is enabled but AUTOTRACE_API_KEY is not "
                "set.  Error reports will be sent without authentication."
            )

    # -- Django middleware interface ------------------------------------------

    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Wrap the downstream middleware / view chain."""
        try:
            response = self.get_response(request)
        except Exception as exc:
            # Capture → report → re-raise so Django's error handling
            # (DEBUG page, logging, etc.) still works normally.
            self._report(request, exc)
            raise

        return response

    # -- Internal helpers ----------------------------------------------------

    def _report(self, request: HttpRequest, exception: BaseException) -> None:
        """Build and ship the error payload — silently swallowing any errors
        that occur during reporting so we never break the host application.
        """
        if not self.enabled:
            return

        try:
            payload = _build_payload(request, exception)
            _send_payload(payload, self.dsn, self.api_key)
            logger.debug("AutoTrace: error reported successfully.")
        except Exception:
            # ----- FAIL SILENTLY -----
            # If AutoTrace's servers are unreachable, misconfigured, or the
            # payload can't be serialised, we absolutely must not let that
            # crash the client's application a *second* time.
            logger.debug(
                "AutoTrace: failed to report error (suppressed).",
                exc_info=True,
            )
