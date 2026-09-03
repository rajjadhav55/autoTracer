import json
import traceback
from django.utils.deprecation import MiddlewareMixin
from .models import Incident
# pyrefly: ignore [missing-import]
from .tasks import process_incident_task, run_ai_triage_sync

SENSITIVE_KEYS = {'password', 'token', 'secret', 'authorization', 'api_key', 'access_token'}

def sanitize_data(data):
    """Recursively masks sensitive values in dictionaries."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(sensitive in k.lower() for sensitive in SENSITIVE_KEYS):
                sanitized[k] = "********"
            elif isinstance(v, (dict, list)):
                sanitized[k] = sanitize_data(v)
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data

class ExceptionCaptureMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        # 1. Extract request payload safely
        payload = {}
        if request.body:
            try:
                payload = json.loads(request.body.decode('utf-8'))
            except Exception:
                payload = {"raw": str(request.body)}

        sanitized_payload = sanitize_data(payload)

        # 2. Extract and sanitize request headers
        headers = {}
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                clean_key = key[5:].replace('_', '-').title()
                if any(sensitive in clean_key.lower() for sensitive in SENSITIVE_KEYS):
                    headers[clean_key] = "********"
                else:
                    headers[clean_key] = str(value)

        # 3. Capture stack trace
        full_traceback = traceback.format_exc()

        # 4. Save Incident to PostgreSQL
        incident = Incident.objects.create(
            error_type=exception.__class__.__name__,
            error_message=str(exception),
            traceback=full_traceback,
            endpoint=request.path,
            http_method=request.method,
            request_payload=sanitized_payload,
            headers=headers,
            status='PENDING'
        )

        # 5. Dispatch async analysis to Celery worker with synchronous fallback
        try:
            process_incident_task.delay(str(incident.id))
        except Exception:
            run_ai_triage_sync(str(incident.id))

        # Returning None allows standard Django error handling to continue
        return None