# AutoTrace Python SDK (`autotrace-py`)

Lightweight, zero-dependency Python client for autonomous error tracking and AI triage with [AutoTrace](https://autotrace.io).

## Installation

```bash
pip install autotrace
# or from source:
pip install -e ./sdk/python
```

## Quickstart

```python
import autotrace

# 1. Initialize once at application startup
autotrace.init(
    api_key="autotrace_pk_your_project_key",
    endpoint_url="http://localhost:8000/api/ingest/",
    environment="production",
    context={"service": "payment-api", "version": "2.1.0"},
)

# 2. Manual Exception Capture
try:
    process_order()
except Exception as exc:
    autotrace.capture_exception(
        exc_info=exc,
        endpoint="/api/v1/orders",
        context={"user_id": "usr_123"},
    )
```

## Function Decorator

```python
@autotrace.trace(endpoint="/jobs/sync-inventory")
def sync_inventory():
    # If this raises, AutoTrace captures the error and traceback
    perform_risky_task()
```

## Framework Integrations

### Django

In your `settings.py`:
```python
AUTOTRACE_API_KEY = "autotrace_pk_your_project_key"
AUTOTRACE_ENDPOINT = "http://localhost:8000/api/ingest/"

MIDDLEWARE = [
    # ... other middleware
    "autotrace.integrations.django.AutoTraceMiddleware",
]
```

### FastAPI / Starlette

In your `main.py`:
```python
from fastapi import FastAPI
import autotrace
from autotrace.integrations.fastapi import AutoTraceMiddleware

autotrace.init(api_key="autotrace_pk_your_project_key")

app = FastAPI()
app.add_middleware(AutoTraceMiddleware)
```
