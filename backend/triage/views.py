import json
import logging

from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response

from .models import Incident
from .serializers import IncidentListSerializer, IncidentDetailSerializer
from .services import execute_chaos_scenario
from .tasks import process_error_payload

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dashboard API — list & detail views for the React frontend
# ---------------------------------------------------------------------------

class IncidentListView(generics.ListAPIView):
    """Return a paginated list of incidents, newest first.

    ``GET /api/incidents/``

    The response includes a ``counts`` object in the top-level payload with
    per-status tallies so the frontend can render metric cards without a
    second request.
    """
    serializer_class = IncidentListSerializer
    queryset = Incident.objects.all().order_by("-created_at")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        # Compute status counts across the *full* queryset (not just the page)
        counts_qs = (
            Incident.objects
            .values("status")
            .annotate(count=Count("id"))
        )
        counts = {row["status"]: row["count"] for row in counts_qs}
        total = sum(counts.values())

        response.data = {
            "counts": {
                "total": total,
                "pending": counts.get("PENDING", 0),
                "analyzing": counts.get("ANALYZING", 0),
                "triaged": counts.get("TRIAGED", 0),
                "failed": counts.get("FAILED", 0),
                "resolved": counts.get("RESOLVED", 0),
            },
            "results": response.data,
        }
        return response


class IncidentDetailView(generics.RetrieveAPIView):
    """Return full detail for a single incident.

    ``GET /api/incidents/<uuid>/``
    """
    serializer_class = IncidentDetailSerializer
    queryset = Incident.objects.all()
    lookup_field = "pk"


# ---------------------------------------------------------------------------
# SDK ingestion endpoint — receives payloads from AutoTraceMiddleware
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def ingest_error_event(request):
    """Receive an error event from a client SDK and queue it for processing.

    Route: ``POST /ingest/``

    Expected headers:
        ``X-AutoTrace-Key`` — project API key (must be non-empty).

    Expected body:
        JSON matching the payload schema produced by ``AutoTraceMiddleware``::

            {
                "exception": {"type": "...", "message": "...", "traceback": [...]},
                "request":   {"method": "...", "path": "...", "headers": {...}, "body": {...}},
                "server":    {"server_name": "...", "server_port": "..."},
                "timestamp": "...",
                "sdk":       {"name": "...", "version": "..."}
            }

    Returns:
        ``202 Accepted`` with ``{"status": "queued", "incident_id": "..."}``
        on success, or an appropriate 4xx error.
    """
    # ── 1. Validate API key ─────────────────────────────────────────────
    api_key = request.META.get("HTTP_X_AUTOTRACE_KEY", "").strip()
    if not api_key:
        return JsonResponse(
            {"error": "Missing or empty X-AutoTrace-Key header."},
            status=401,
        )

    # ── 2. Parse JSON body ──────────────────────────────────────────────
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        return JsonResponse(
            {"error": f"Invalid JSON payload: {exc}"},
            status=400,
        )

    exc_data = data.get("exception", {})
    req_data = data.get("request", {})

    if not exc_data.get("type"):
        return JsonResponse(
            {"error": "Payload must include 'exception.type'."},
            status=422,
        )

    # ── 3. Persist Incident ─────────────────────────────────────────────
    traceback_text = "\n".join(exc_data.get("traceback", []))

    incident = Incident.objects.create(
        error_type=exc_data.get("type", "UnknownError"),
        error_message=exc_data.get("message", ""),
        traceback=traceback_text,
        endpoint=req_data.get("path", ""),
        http_method=req_data.get("method", ""),
        request_payload=req_data.get("body", {}),
        headers=req_data.get("headers", {}),
        status="PENDING",
    )

    # ── 4. Dispatch async processing ────────────────────────────────────
    process_error_payload.delay(
        str(incident.id),
        {
            "server": data.get("server", {}),
            "timestamp": data.get("timestamp", ""),
            "sdk": data.get("sdk", {}),
        },
    )

    logger.info(
        "[AutoTrace] Ingested event %s (%s) — queued for processing.",
        incident.id,
        incident.error_type,
    )

    # ── 5. Return immediately ───────────────────────────────────────────
    return JsonResponse(
        {"status": "queued", "incident_id": str(incident.id)},
        status=202,
    )


# ---------------------------------------------------------------------------
# Chaos testing endpoint
# ---------------------------------------------------------------------------

class ChaosTriggerView(APIView):
    """
    Endpoint to simulate production failures for testing AutoTrace triage.
    Usage: POST /api/chaos/trigger/?scenario=<type>
    """
    def post(self, request):
        # 1. Get the HTTP parameter
        scenario = request.query_params.get('scenario', 'null_pointer')

        # 2. Pass the data to the service layer to do the actual work
        execute_chaos_scenario(scenario)

        # 3. Return HTTP response (though the service will crash the app before this runs!)
        return Response({"status": "Success", "message": f"Scenario {scenario} triggered."})