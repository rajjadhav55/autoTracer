"""
AutoTrace Python SDK Client (autotrace-py)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lightweight client for capturing and reporting application exceptions
asynchronously to the AutoTrace backend in detached, fire-and-forget background threads.
Zero Celery dependencies. Never blocks the main application response thread.
"""

from __future__ import annotations

import atexit
import concurrent.futures
import json
import logging
import os
import platform
import re
import sys
import threading
import traceback
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False
    import urllib.error
    import urllib.request

logger = logging.getLogger("autotrace")

# ---------------------------------------------------------------------------
# Constants & Defaults
# ---------------------------------------------------------------------------

DEFAULT_ENDPOINT = "https://autotrace-backend.onrender.com/api/ingest/"
DEFAULT_ENVIRONMENT = "production"
TIMEOUT_SECONDS = 5.0
SDK_VERSION = "0.1.2"

SENSITIVE_PATTERNS = re.compile(
    r"(password|secret|token|authorization|api_key|access_token)", re.IGNORECASE
)
MASK_VALUE = "********"


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
# Asynchronous Background Dispatch Pool
# ---------------------------------------------------------------------------

class _DispatchPool:
    """Global ThreadPoolExecutor managing detached fire-and-forget dispatches."""
    _instance: Optional[concurrent.futures.ThreadPoolExecutor] = None
    _lock = threading.Lock()

    @classmethod
    def get_executor(cls) -> concurrent.futures.ThreadPoolExecutor:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = concurrent.futures.ThreadPoolExecutor(
                        max_workers=4,
                        thread_name_prefix="autotrace-dispatcher",
                    )
        return cls._instance

    @classmethod
    def shutdown(cls, wait: bool = False) -> None:
        if cls._instance is not None:
            cls._instance.shutdown(wait=wait, cancel_futures=True)


atexit.register(lambda: _DispatchPool.shutdown(wait=False))


# ---------------------------------------------------------------------------
# AutoTrace Client
# ---------------------------------------------------------------------------

class AutoTraceClient:
    """Core SDK client managing detached, fire-and-forget dispatch of error events."""

    def __init__(
        self,
        api_key: str,
        endpoint_url: Optional[str] = None,
        environment: str = DEFAULT_ENVIRONMENT,
        default_context: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.endpoint_url = (endpoint_url or DEFAULT_ENDPOINT).strip()
        self.environment = environment
        self.default_context = default_context or {}

    def _send_network_payload(self, payload: Dict[str, Any]) -> Tuple[int, Optional[Dict[str, Any]]]:
        """Perform HTTP POST in detached background worker thread. Fails silently."""
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "X-AutoTrace-Key": self.api_key,
            "User-Agent": f"autotrace-py/{SDK_VERSION} (Python {platform.python_version()})",
        }

        # 1. Prefer requests if available
        if _HAS_REQUESTS:
            try:
                resp = requests.post(
                    self.endpoint_url,
                    json=payload,
                    headers=headers,
                    timeout=TIMEOUT_SECONDS,
                )
                status_code = resp.status_code
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}
                logger.debug("AutoTrace: event reported via requests (HTTP %s)", status_code)
                return status_code, data
            except Exception as exc:
                logger.debug("AutoTrace: requests delivery failed (suppressed): %s", exc)
                return 0, {"error": str(exc)}

        # 2. Fallback to stdlib urllib.request
        try:
            body = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint_url,
                data=body,
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                status_code = resp.status
                resp_text = resp.read().decode("utf-8", errors="replace")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    data = {"raw": resp_text}
                logger.debug("AutoTrace: event reported via urllib (HTTP %s)", status_code)
                return status_code, data
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.debug("AutoTrace: API error HTTP %s: %s", exc.code, err_body)
            return exc.code, {"error": err_body}
        except Exception as exc:
            logger.debug("AutoTrace: urllib delivery failed (suppressed): %s", exc)
            return 0, {"error": str(exc)}

    def capture_exception(
        self,
        exc_info: Optional[Union[BaseException, Tuple[Any, ...], bool]] = None,
        context: Optional[Dict[str, Any]] = None,
        endpoint: Optional[str] = None,
        sync: bool = False,
        callback: Optional[Callable[[int, Optional[Dict[str, Any]]], None]] = None,
    ) -> Optional[Tuple[int, Optional[Dict[str, Any]]]]:
        """Capture and format an unhandled exception for AutoTrace ingestion.

        When sync=False (default), dispatches in a detached background thread
        using concurrent.futures.ThreadPoolExecutor so it never blocks the caller.
        """
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
        service_name = (
            merged_context.get("service")
            or merged_context.get("application_name")
            or merged_context.get("project_name")
            or "default-app"
        )
        payload = {
            "application_name": service_name,
            "error_type": exc_type.__name__ if exc_type else "Exception",
            "error_message": str(exc_val),
            "endpoint": endpoint or "",
            "runtime": runtime_str,
            "traceback": tb_lines,
            "stack_trace": "\n".join(tb_lines),
            "context": sanitize_data(merged_context),
            "environment": self.environment,
            "exception": {
                "type": exc_type.__name__ if exc_type else "Exception",
                "message": str(exc_val),
                "traceback": tb_lines,
            },
            "sdk": {
                "name": "autotrace-python",
                "version": SDK_VERSION,
            },
        }

        # 6. Synchronous mode (for test suite verification)
        if sync:
            return self._send_network_payload(payload)

        # 7. Fire-and-forget asynchronous background dispatch
        def _async_task():
            try:
                status_code, data = self._send_network_payload(payload)
                if callback:
                    callback(status_code, data)
            except Exception as exc:
                logger.debug("AutoTrace background task suppressed error: %s", exc)

        try:
            executor = _DispatchPool.get_executor()
            executor.submit(_async_task)
        except Exception:
            # Fallback to detached thread if pool is unavailable
            try:
                t = threading.Thread(
                    target=_async_task,
                    daemon=True,
                    name="autotrace-detached-worker",
                )
                t.start()
            except Exception as exc:
                logger.debug("AutoTrace: failed to start detached worker thread: %s", exc)

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
        """Flush pending background dispatches."""
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
    """Initialize the global AutoTrace client instance."""
    global _GLOBAL_CLIENT
    _GLOBAL_CLIENT = AutoTraceClient(
        api_key=api_key,
        endpoint_url=endpoint_url,
        environment=environment,
        default_context=context,
    )
    logger.info("AutoTrace Python SDK initialized (fire-and-forget async dispatcher active).")
    return _GLOBAL_CLIENT


def get_client() -> Optional[AutoTraceClient]:
    """Retrieve the currently initialized global AutoTrace client."""
    return _GLOBAL_CLIENT


def capture_exception(
    exc_info: Optional[Union[BaseException, Tuple[Any, ...], bool]] = None,
    context: Optional[Dict[str, Any]] = None,
    endpoint: Optional[str] = None,
    sync: bool = False,
    callback: Optional[Callable[[int, Optional[Dict[str, Any]]], None]] = None,
) -> Optional[Tuple[int, Optional[Dict[str, Any]]]]:
    """Capture and dispatch an exception using the global client in a detached background thread."""
    client = get_client()
    if client is None:
        # Check environment variable fallback
        env_key = os.environ.get("AUTOTRACE_API_KEY") or os.environ.get("AUTOTRACE_KEY")
        if env_key:
            client = init(
                api_key=env_key,
                endpoint_url=os.environ.get("AUTOTRACE_API_URL") or os.environ.get("AUTOTRACE_ENDPOINT") or DEFAULT_ENDPOINT,
                environment=os.environ.get("AUTOTRACE_ENVIRONMENT", DEFAULT_ENVIRONMENT),
            )
        else:
            logger.debug("AutoTrace: capture_exception called before autotrace.init().")
            return None

    return client.capture_exception(
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
    """Decorator to capture unhandled exceptions from a function."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                capture_exception(
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
    """Flush pending background tasks."""
    if _GLOBAL_CLIENT:
        _GLOBAL_CLIENT.flush(timeout=timeout)
