"""
AutoTrace Python SDK Client (autotrace-py)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lightweight, zero-dependency client for capturing and reporting
application exceptions asynchronously to the AutoTrace backend.
"""

from __future__ import annotations

import atexit
import json
import logging
import os
import platform
import queue
import re
import sys
import threading
import traceback
import urllib.error
import urllib.request
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("autotrace")

# ---------------------------------------------------------------------------
# Constants & Defaults
# ---------------------------------------------------------------------------

DEFAULT_ENDPOINT = "http://localhost:8000/api/ingest/"
DEFAULT_ENVIRONMENT = "production"
TIMEOUT_SECONDS = 5.0

SENSITIVE_PATTERNS = re.compile(
    r"(password|secret|token|authorization|api_key|access_token)", re.IGNORECASE
)
MASK_VALUE = "********"


# ---------------------------------------------------------------------------
# Data Sanitization
# ---------------------------------------------------------------------------

def _is_sensitive(key: str) -> bool:
    return bool(SENSITIVE_PATTERNS.search(str(key)))


def sanitize_data(data: Any) -> Any:
    """Recursively scrub sensitive keys in dictionaries and lists."""
    if isinstance(data, dict):
        return {
            k: (MASK_VALUE if _is_sensitive(k) else sanitize_data(v))
            for k, v in data.items()
        }
    elif isinstance(data, (list, tuple)):
        return [sanitize_data(item) for item in data]
    return data


# ---------------------------------------------------------------------------
# AutoTrace Client
# ---------------------------------------------------------------------------

class AutoTraceClient:
    """Core SDK client managing asynchronous dispatch of error events."""

    def __init__(
        self,
        api_key: str,
        endpoint_url: str = DEFAULT_ENDPOINT,
        environment: str = DEFAULT_ENVIRONMENT,
        default_context: Optional[Dict[str, Any]] = None,
        max_queue_size: int = 1000,
    ) -> None:
        self.api_key = api_key.strip()
        self.endpoint_url = endpoint_url
        self.environment = environment
        self.default_context = default_context or {}

        # Asynchronous background worker queue
        self._queue: queue.Queue = queue.Queue(maxsize=max_queue_size)
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            daemon=True,
            name="autotrace-worker",
        )
        self._worker_thread.start()

        # Register exit handler to flush pending events
        atexit.register(self.flush)

    def _worker_loop(self) -> None:
        """Background daemon thread that consumes and dispatches events."""
        while True:
            try:
                payload, callback = self._queue.get()
                if payload is None:
                    # Poison pill to shut down worker if needed
                    self._queue.task_done()
                    break
                status_code, response_data = self._send_http(payload)
                if callback:
                    callback(status_code, response_data)
                self._queue.task_done()
            except Exception as exc:
                logger.debug("AutoTrace worker encountered an error (suppressed): %s", exc)

    def _send_http(self, payload: Dict[str, Any]) -> Tuple[int, Optional[Dict[str, Any]]]:
        """Perform a blocking HTTP POST with a short timeout. Fails silently."""
        try:
            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint_url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": self.api_key,
                    "User-Agent": f"autotrace-py/0.1.0 (Python {platform.python_version()})",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                status_code = resp.status
                resp_text = resp.read().decode("utf-8", errors="replace")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    data = {"raw": resp_text}
                logger.debug("AutoTrace: event reported (HTTP %s)", status_code)
                return status_code, data
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.debug("AutoTrace: API error HTTP %s: %s", exc.code, err_body)
            return exc.code, {"error": err_body}
        except Exception as exc:
            logger.debug("AutoTrace: delivery failed (suppressed): %s", exc)
            return 0, {"error": str(exc)}

    def capture_exception(
        self,
        exc_info: Optional[Union[BaseException, Tuple[Any, ...], bool]] = None,
        context: Optional[Dict[str, Any]] = None,
        endpoint: Optional[str] = None,
        sync: bool = False,
        callback: Optional[Callable[[int, Optional[Dict[str, Any]]], None]] = None,
    ) -> Optional[Tuple[int, Optional[Dict[str, Any]]]]:
        """Capture and format an unhandled exception for AutoTrace ingestion."""
        # 1. Resolve exception details
        if exc_info is True or exc_info is None:
            exc_type, exc_val, exc_tb = sys.exc_info()
        elif isinstance(exc_info, BaseException):
            exc_type, exc_val, exc_tb = type(exc_info), exc_info, exc_info.__traceback__
        elif isinstance(exc_info, tuple) and len(exc_info) == 3:
            exc_type, exc_val, exc_tb = exc_info
        else:
            exc_type, exc_val, exc_tb = None, None, None

        if exc_val is None:
            logger.debug("AutoTrace: capture_exception called with no active exception.")
            return None

        # 2. Format traceback array
        tb_lines: List[str] = []
        try:
            raw_lines = traceback.format_exception(exc_type, exc_val, exc_tb)
            for chunk in raw_lines:
                tb_lines.extend(chunk.splitlines())
        except Exception:
            tb_lines = [f"{exc_type}: {exc_val}"]

        # 3. Assemble runtime metadata
        runtime_str = f"python {platform.python_version()}"

        # 4. Merge context
        merged_context: Dict[str, Any] = {
            **self.default_context,
            "environment": self.environment,
            "os": f"{platform.system()} {platform.release()}",
            "architecture": platform.machine(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if context:
            merged_context.update(context)

        # 5. Build universal ingestion payload
        payload = {
            "error_type": exc_type.__name__ if exc_type else "Exception",
            "error_message": str(exc_val),
            "endpoint": endpoint or "",
            "runtime": runtime_str,
            "traceback": tb_lines,
            "context": sanitize_data(merged_context),
        }

        # 6. Dispatch synchronously or queue for background thread
        if sync:
            return self._send_http(payload)

        try:
            self._queue.put_nowait((payload, callback))
        except queue.Full:
            logger.warning("AutoTrace: event queue is full, dropping error event.")

        return None

    def trace(
        self,
        endpoint: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        reraise: bool = False,
    ) -> Callable:
        """Decorator to automatically catch and report unhandled errors."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    self.capture_exception(
                        exc_info=exc,
                        endpoint=endpoint or func.__qualname__,
                        context=context,
                    )
                    if reraise:
                        raise
                    return None
            return wrapper
        return decorator

    def flush(self, timeout: float = 3.0) -> None:
        """Block until all queued events are sent, up to *timeout* seconds."""
        try:
            self._queue.join()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Global Singleton Interface
# ---------------------------------------------------------------------------

_GLOBAL_CLIENT: Optional[AutoTraceClient] = None


def init(
    api_key: str,
    endpoint_url: str = DEFAULT_ENDPOINT,
    environment: str = DEFAULT_ENVIRONMENT,
    context: Optional[Dict[str, Any]] = None,
) -> AutoTraceClient:
    """Initialize the global AutoTrace client singleton."""
    global _GLOBAL_CLIENT
    _GLOBAL_CLIENT = AutoTraceClient(
        api_key=api_key,
        endpoint_url=endpoint_url,
        environment=environment,
        default_context=context,
    )
    logger.debug("AutoTrace SDK initialized for environment '%s'.", environment)
    return _GLOBAL_CLIENT


def get_client() -> Optional[AutoTraceClient]:
    """Retrieve the global AutoTrace client instance."""
    return _GLOBAL_CLIENT


def capture_exception(
    exc_info: Optional[Union[BaseException, Tuple[Any, ...], bool]] = None,
    context: Optional[Dict[str, Any]] = None,
    endpoint: Optional[str] = None,
    sync: bool = False,
    callback: Optional[Callable[[int, Optional[Dict[str, Any]]], None]] = None,
) -> Optional[Tuple[int, Optional[Dict[str, Any]]]]:
    """Capture an exception with the global client."""
    if _GLOBAL_CLIENT is None:
        logger.warning("AutoTrace SDK is not initialized. Call autotrace.init(...) first.")
        return None
    return _GLOBAL_CLIENT.capture_exception(
        exc_info=exc_info,
        context=context,
        endpoint=endpoint,
        sync=sync,
        callback=callback,
    )


def trace(
    endpoint: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    reraise: bool = False,
) -> Callable:
    """Decorator to catch and report exceptions using the global client."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                if _GLOBAL_CLIENT:
                    _GLOBAL_CLIENT.capture_exception(
                        exc_info=exc,
                        endpoint=endpoint or func.__qualname__,
                        context=context,
                    )
                if reraise:
                    raise
                return None
        return wrapper
    return decorator


def flush(timeout: float = 3.0) -> None:
    """Flush pending events queued in the global client."""
    if _GLOBAL_CLIENT:
        _GLOBAL_CLIENT.flush(timeout=timeout)
