"""
AutoTrace Django Middleware — Client SDK
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Drop-in Django middleware that captures unhandled exceptions and reports
them to the AutoTrace ingestion API in a detached, non-blocking background thread.
Zero Celery dependencies. Never delays or blocks Django HTTP response times.

Quick start
-----------
1.  Add to your Django ``settings.py``:

        MIDDLEWARE = [
            ...
            'autotrace.middleware.AutoTraceMiddleware',
        ]

        AUTOTRACE_API_KEY = "autotrace_pk_..."
        AUTOTRACE_API_URL = "https://autotrace-backend.onrender.com/api/ingest/"  # optional
        AUTOTRACE_PROJECT_NAME = "my-django-service"  # optional

2.  That's it — unhandled 500s are captured and reported in detached background threads.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Dict, Optional

from autotrace.client import (
    DEFAULT_ENDPOINT,
    DEFAULT_ENVIRONMENT,
    AutoTraceClient,
    capture_exception,
    get_client,
    init,
    sanitize_data,
)

logger = logging.getLogger("autotrace.middleware")


class AutoTraceMiddleware:
    """Django middleware that reports unhandled exceptions to AutoTrace asynchronously."""

    def __init__(self, get_response: Optional[Callable] = None) -> None:
        self.get_response = get_response
        self.enabled = True
        self.api_key = ""
        self.endpoint_url = DEFAULT_ENDPOINT
        self.project_name = "django-app"
        self.environment = DEFAULT_ENVIRONMENT

        # Auto-initialize configuration from Django settings
        try:
            from django.conf import settings

            self.enabled = getattr(settings, "AUTOTRACE_ENABLED", True)
            self.api_key = (
                getattr(settings, "AUTOTRACE_API_KEY", "")
                or getattr(settings, "AUTOTRACE_KEY", "")
            ).strip()

            raw_endpoint = (
                getattr(settings, "AUTOTRACE_API_URL", "")
                or getattr(settings, "AUTOTRACE_ENDPOINT", "")
                or getattr(settings, "AUTOTRACE_DSN", "")
                or DEFAULT_ENDPOINT
            ).strip()

            if raw_endpoint.endswith("/api/errors/") or raw_endpoint.endswith("/api/errors"):
                raw_endpoint = raw_endpoint.rstrip("/").replace("/api/errors", "/api/ingest/")
            elif raw_endpoint.endswith("/api/") or raw_endpoint.endswith("/api"):
                raw_endpoint = raw_endpoint.rstrip("/") + "/ingest/"
            elif not raw_endpoint.endswith("/"):
                raw_endpoint = f"{raw_endpoint}/"

            self.endpoint_url = raw_endpoint

            self.project_name = (
                getattr(settings, "AUTOTRACE_PROJECT_NAME", "")
                or getattr(settings, "AUTOTRACE_SERVICE", "")
                or "django-app"
            )

            self.environment = getattr(
                settings, "AUTOTRACE_ENVIRONMENT", DEFAULT_ENVIRONMENT
            )

            if self.enabled and self.api_key and get_client() is None:
                init(
                    api_key=self.api_key,
                    endpoint_url=self.endpoint_url,
                    environment=self.environment,
                    context={"service": self.project_name},
                )
            elif self.enabled and not self.api_key:
                logger.warning(
                    "AutoTraceMiddleware is active but AUTOTRACE_API_KEY is not configured in settings."
                )
        except Exception as exc:
            logger.debug("AutoTrace: settings initialization skipped: %s", exc)

    def __call__(self, request: Any) -> Any:
        """Process the request and catch any unhandled exceptions."""
        try:
            response = self.get_response(request) if self.get_response else None
            return response
        except Exception as exc:
            self.process_exception(request, exc)
            raise

    def process_exception(self, request: Any, exception: BaseException) -> None:
        """Capture request telemetry and dispatch error event in a detached background thread."""
        if not self.enabled:
            return

        try:
            # 1. Extract and sanitize HTTP headers from request.META
            headers: Dict[str, str] = {}
            meta = getattr(request, "META", {})
            for key, value in meta.items():
                if key.startswith("HTTP_"):
                    header_name = key[5:].replace("_", "-").title()
                    headers[header_name] = str(value)
                elif key in ("CONTENT_TYPE", "CONTENT_LENGTH", "REMOTE_ADDR"):
                    headers[key.replace("_", "-").title()] = str(value)

            # 2. Extract query parameters
            query_params: Dict[str, Any] = {}
            get_params = getattr(request, "GET", None)
            if get_params:
                try:
                    query_params = dict(get_params.items())
                except Exception:
                    pass

            # 3. Best-effort parse body payload
            body_data: Any = None
            raw_body = getattr(request, "body", None)
            if raw_body:
                try:
                    body_data = json.loads(raw_body.decode("utf-8", errors="replace"))
                except Exception:
                    try:
                        body_data = raw_body.decode("utf-8", errors="replace")[:1000]
                    except Exception:
                        body_data = "<binary data>"

            # 4. Resolve authenticated user identifier
            user_repr = "anonymous"
            req_user = getattr(request, "user", None)
            if req_user and getattr(req_user, "is_authenticated", False):
                user_repr = getattr(req_user, "username", str(req_user))

            # 5. Assemble context dict
            context: Dict[str, Any] = {
                "service": self.project_name,
                "environment": self.environment,
                "method": getattr(request, "method", "UNKNOWN"),
                "path": getattr(request, "path", ""),
                "query_params": sanitize_data(query_params),
                "headers": sanitize_data(headers),
                "body": sanitize_data(body_data),
                "user": user_repr,
            }

            # 6. Dispatch in detached background thread (fire-and-forget)
            capture_exception(
                exc_info=exception,
                endpoint=getattr(request, "path", ""),
                context=context,
                sync=False,
            )
            logger.debug("AutoTrace: exception dispatched in background thread.")
        except Exception as exc:
            # Silently swallow any SDK internal error so host application NEVER crashes
            logger.debug("AutoTrace: failed to capture exception (suppressed): %s", exc)
