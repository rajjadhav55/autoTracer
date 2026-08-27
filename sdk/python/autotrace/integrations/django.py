"""
AutoTrace Django Integration Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Captures unhandled exceptions during Django request handling and reports
them to AutoTrace with sanitized request metadata and telemetry.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, Optional

from autotrace.client import capture_exception, init, get_client


class AutoTraceMiddleware:
    """Django middleware to automatically report unhandled exceptions."""

    def __init__(self, get_response: Optional[Callable] = None) -> None:
        self.get_response = get_response

        # Auto-initialize if settings.AUTOTRACE_API_KEY is configured
        try:
            from django.conf import settings
            if get_client() is None and hasattr(settings, "AUTOTRACE_API_KEY"):
                init(
                    api_key=settings.AUTOTRACE_API_KEY,
                    endpoint_url=getattr(settings, "AUTOTRACE_ENDPOINT", "http://localhost:8000/api/ingest/"),
                    environment=getattr(settings, "AUTOTRACE_ENVIRONMENT", "production"),
                )
        except Exception:
            pass

    def __call__(self, request: Any) -> Any:
        try:
            response = self.get_response(request) if self.get_response else None
            return response
        except Exception as exc:
            self.process_exception(request, exc)
            raise

    def process_exception(self, request: Any, exception: BaseException) -> None:
        """Capture request telemetry and dispatch error event to AutoTrace."""
        headers: Dict[str, str] = {}
        for key, value in getattr(request, "META", {}).items():
            if key.startswith("HTTP_"):
                header_name = key[5:].replace("_", "-").title()
                headers[header_name] = str(value)
            elif key in ("CONTENT_TYPE", "CONTENT_LENGTH", "REMOTE_ADDR"):
                headers[key.replace("_", "-").title()] = str(value)

        # Parse request query params
        query_params = dict(getattr(request, "GET", {}).items())

        # Best-effort parse body payload
        body_data: Any = None
        try:
            raw_body = getattr(request, "body", None)
            if raw_body:
                body_data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            pass

        context: Dict[str, Any] = {
            "method": getattr(request, "method", "UNKNOWN"),
            "path": getattr(request, "path", ""),
            "headers": headers,
            "query_params": query_params,
            "body": body_data,
            "user": str(getattr(request, "user", "anonymous")),
        }

        capture_exception(
            exc_info=exception,
            endpoint=getattr(request, "path", ""),
            context=context,
        )
