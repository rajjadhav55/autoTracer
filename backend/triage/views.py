import json
import logging

from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

# pyrefly: ignore [missing-import]
from rest_framework import generics, status
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response

from .models import Incident, Project
from .serializers import IncidentListSerializer, IncidentDetailSerializer
from .services import execute_chaos_scenario
from .tasks import analyze_incident_with_ai, process_error_payload

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
# Universal Error Ingestion API Endpoint
# ---------------------------------------------------------------------------

class UniversalIngestView(APIView):
    """
    Universal ingestion endpoint for multi-tenant, multi-language client SDKs.
    Route: POST /api/ingest/

    Authentication:
        X-API-Key header required (matches a registered Project).
        Returns 401 if missing, 403 if invalid / project does not exist.

    Expected payload format:
        {
            "error_type": "ZeroDivisionError",
            "error_message": "division by zero",
            "endpoint": "/api/v1/checkout",
            "runtime": "python",
            "traceback": [ ... ] or "...",
            "context": { ... }
        }
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        # 1. Extract API key from header (X-API-Key, case-insensitive)
        api_key = (
            request.headers.get("X-API-Key")
            or request.headers.get("x-api-key")
            or request.META.get("HTTP_X_API_KEY", "")
        ).strip()

        # Fallback to legacy X-AutoTrace-Key if provided
        if not api_key:
            api_key = (
                request.headers.get("X-AutoTrace-Key")
                or request.META.get("HTTP_X_AUTOTRACE_KEY", "")
            ).strip()

        if not api_key:
            return Response(
                {"error": "Authentication required. Missing X-API-Key header."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 2. Validate Project existence
        try:
            project = Project.objects.get(api_key=api_key)
        except Project.DoesNotExist:
            return Response(
                {"error": "Forbidden. Invalid API key or project not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 3. Parse request payload
        payload = request.data if isinstance(request.data, dict) else {}

        # Universal extraction supporting both flat spec and nested SDK payloads
        error_type = (
            payload.get("error_type")
            or payload.get("exception", {}).get("type")
            or "UnknownError"
        )
        error_message = (
            payload.get("error_message")
            or payload.get("exception", {}).get("message")
            or ""
        )
        endpoint = (
            payload.get("endpoint")
            or payload.get("request", {}).get("path")
            or ""
        )
        runtime = (
            payload.get("runtime")
            or payload.get("sdk", {}).get("name")
            or "generic"
        )

        traceback_data = (
            payload.get("traceback")
            if "traceback" in payload
            else payload.get("exception", {}).get("traceback", [])
        )

        context_data = (
            payload.get("context")
            or payload.get("context_data")
            or {
                "request": payload.get("request", {}),
                "server": payload.get("server", {}),
                "sdk": payload.get("sdk", {}),
            }
        )

        http_method = (
            payload.get("http_method")
            or payload.get("request", {}).get("method")
            or context_data.get("method")
            or ""
        )

        # 4. Save Incident tied strictly to authenticated Project
        incident = Incident.objects.create(
            project=project,
            error_type=error_type,
            error_message=error_message,
            endpoint=endpoint,
            runtime=runtime,
            traceback=traceback_data,
            context_data=context_data,
            http_method=http_method,
            status="PENDING",
        )

        # 5. Async Trigger to Celery
        analyze_incident_with_ai.delay(str(incident.id))

        logger.info(
            "[AutoTrace] Ingested incident %s (%s, runtime=%s) for project '%s' (id=%s).",
            incident.id,
            incident.error_type,
            incident.runtime,
            project.name,
            project.id,
        )

        # 6. Return 201 Created
        return Response(
            {
                "status": "success",
                "incident_id": str(incident.id),
                "project": project.name,
                "message": "Incident ingested and queued for AI analysis.",
            },
            status=status.HTTP_201_CREATED,
        )


# Backward-compatible alias for existing imports / function tests
ingest_error_event = UniversalIngestView.as_view()


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