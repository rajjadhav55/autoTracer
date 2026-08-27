"""
AutoTrace FastAPI / Starlette Integration Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ASGI middleware that intercepts unhandled exceptions in FastAPI / Starlette
applications, captures route & header metadata, and reports them to AutoTrace.
"""

from __future__ import annotations

from typing import Any, Callable, Dict

from autotrace.client import capture_exception


class AutoTraceMiddleware:
    """ASGI middleware for FastAPI and Starlette applications."""

    def __init__(self, app: Callable) -> None:
        self.app = app

    async def __call__(self, scope: Dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            # Extract headers from ASGI scope
            headers: Dict[str, str] = {}
            for raw_k, raw_v in scope.get("headers", []):
                k = raw_k.decode("latin1").lower()
                v = raw_v.decode("latin1")
                headers[k] = v

            endpoint = scope.get("path", "")
            method = scope.get("method", "GET")
            query_string = scope.get("query_string", b"").decode("latin1")

            context = {
                "method": method,
                "path": endpoint,
                "query_string": query_string,
                "headers": headers,
                "client": scope.get("client"),
                "server": scope.get("server"),
            }

            capture_exception(
                exc_info=exc,
                endpoint=endpoint,
                context=context,
            )
            # Re-raise so FastAPI's error handlers / status responses continue
            raise
