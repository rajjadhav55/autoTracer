"""
AutoTrace Python SDK (autotrace-py)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Autonomous error tracking and AI-powered incident triage.
Detached fire-and-forget async background dispatcher.
"""

from autotrace.client import (
    AutoTraceClient,
    capture_exception,
    flush,
    get_client,
    init,
    sanitize_data,
    trace,
)
from autotrace.middleware import AutoTraceMiddleware

__all__ = [
    "init",
    "capture_exception",
    "trace",
    "flush",
    "get_client",
    "AutoTraceClient",
    "AutoTraceMiddleware",
    "sanitize_data",
]

__version__ = "0.1.2"
