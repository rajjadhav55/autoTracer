"""
AutoTrace Python SDK (autotrace-py)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Autonomous error tracking and AI-powered incident triage.
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

__all__ = [
    "init",
    "capture_exception",
    "trace",
    "flush",
    "get_client",
    "AutoTraceClient",
    "sanitize_data",
]

__version__ = "0.1.0"
