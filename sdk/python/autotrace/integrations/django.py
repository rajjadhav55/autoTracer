"""
AutoTrace Django Integration Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Captures unhandled exceptions during Django request handling and reports
them to AutoTrace with sanitized request metadata in detached background threads.
"""

from __future__ import annotations

from autotrace.middleware import AutoTraceMiddleware

__all__ = ["AutoTraceMiddleware"]
