import json
import logging

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import SDKAPIKeyAuthentication
from .models import ErrorLog, Incident, Project
from .serializers import (
    ErrorIngestionSerializer,
    ErrorLogSerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    UserRegisterSerializer,
    UserSerializer,
)
from .services import execute_chaos_scenario
from .tasks import (
    analyze_incident_with_ai,
    process_incident_task,
    run_ai_triage_sync,
    run_ai_triage_task,
)

try:
    from kombu.exceptions import OperationalError as KombuOperationalError
except ImportError:
    KombuOperationalError = Exception

try:
    from redis.exceptions import ConnectionError as RedisConnectionError, RedisError
except ImportError:
    RedisConnectionError = Exception
    RedisError = Exception

logger = logging.getLogger(__name__)
User = get_user_model()


# ---------------------------------------------------------------------------
# Authentication & User Profile Views
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Registers a new account, generates a unique API key, and returns JWT tokens.
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create default Project for the user
        Project.objects.create(
            user=user,
            name=f"{user.username}-default-project",
            api_key=user.api_key
        )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileView(generics.RetrieveAPIView):
    """
    GET /api/auth/me/
    Returns the authenticated user profile and tracking API key.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class RegenerateAPIKeyView(APIView):
    """
    POST /api/auth/regenerate-key/
    Rotates the authenticated user's API tracking key.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_key = request.user.regenerate_api_key()
        # Also sync project if exists
        Project.objects.filter(user=request.user).update(api_key=new_key)
        return Response({
            "api_key": new_key,
            "message": "API tracking key successfully rotated."
        })


# ---------------------------------------------------------------------------
# Universal Error Ingestion API Endpoint
# ---------------------------------------------------------------------------

class UniversalIngestView(APIView):
    """
    Universal ingestion endpoint for client SDKs (Python, Node, Go, Rust, etc.).
    Route: POST /api/ingest/

    Authentication:
        X-API-Key header required (matches a registered User or Project).
    """
    authentication_classes = [SDKAPIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        payload = request.data if isinstance(request.data, dict) else {}

        serializer = ErrorIngestionSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # 1. Resolve Project and application name
        context_data = (
            data.get("context")
            or payload.get("context")
            or payload.get("context_data")
            or {}
        )
        app_name = (
            data.get("application_name")
            or context_data.get("service")
            or payload.get("sdk", {}).get("name")
            or "default-app"
        )
        environment = (
            data.get("environment")
            or context_data.get("environment")
            or "production"
        )

        project = Project.objects.filter(user=user).first()
        if not project:
            project, _ = Project.objects.get_or_create(
                user=user,
                name=app_name,
                defaults={"api_key": user.api_key}
            )

        # 2. Format stack trace string
        traceback_data = (
            data.get("traceback")
            if "traceback" in data
            else payload.get("exception", {}).get("traceback", [])
        )
        if isinstance(traceback_data, list):
            formatted_stack = "\n".join(str(f) for f in traceback_data)
        else:
            formatted_stack = str(data.get("stack_trace") or traceback_data or "")

        # 3. Create ErrorLog model
        error_log = ErrorLog.objects.create(
            user=user,
            application_name=app_name,
            error_type=data.get("error_type", "UnknownError"),
            error_message=data.get("error_message", ""),
            stack_trace=formatted_stack,
            endpoint=data.get("endpoint", ""),
            environment=environment,
            runtime=data.get("runtime", "python"),
            context_data=context_data,
            status="UNRESOLVED",
        )

        # 4. Create Incident model for AI analysis
        incident = Incident.objects.create(
            id=error_log.id,
            user=user,
            project=project,
            error_type=data.get("error_type", "UnknownError"),
            error_message=data.get("error_message", ""),
            endpoint=data.get("endpoint", ""),
            runtime=data.get("runtime", "python"),
            traceback=traceback_data,
            context_data=context_data,
            http_method=payload.get("http_method", context_data.get("method", "POST")),
            status="PENDING",
        )

        # 5. Dispatch async Celery AI triage task with fallback to synchronous execution
        try:
            run_ai_triage_task.delay(str(incident.id))
            logger.info("[AutoTrace] Queued Celery AI triage task for Incident %s.", incident.id)
        except (RedisConnectionError, RedisError, KombuOperationalError, ConnectionRefusedError, OSError) as redis_exc:
            logger.warning(
                "[AutoTrace] Redis broker unavailable (%s). Falling back to synchronous triage for Incident %s.",
                redis_exc,
                incident.id,
            )
            run_ai_triage_sync(str(incident.id))
        except Exception as exc:
            logger.warning(
                "[AutoTrace] Failed to queue Celery triage task (%s). Executing triage synchronously for Incident %s.",
                exc,
                incident.id,
            )
            run_ai_triage_sync(str(incident.id))

        logger.info(
            "[AutoTrace] Ingested error %s (%s, runtime=%s) for user '%s'.",
            incident.id,
            incident.error_type,
            incident.runtime,
            user.username,
        )

        incident.refresh_from_db(fields=["status"])
        msg = (
            "Incident ingested and triaged successfully."
            if incident.status == "TRIAGED"
            else "Incident ingested and queued for AI analysis."
        )

        return Response(
            {
                "status": "success",
                "id": str(error_log.id),
                "incident_id": str(incident.id),
                "incident_status": incident.status,
                "project": project.name if project else app_name,
                "message": msg,
            },
            status=status.HTTP_201_CREATED,
        )


# Backward-compatible alias
ingest_error_event = UniversalIngestView.as_view()


# ---------------------------------------------------------------------------
# Dashboard API — List & Detail Views
# ---------------------------------------------------------------------------

class IncidentListView(generics.ListAPIView):
    """
    Return a list of errors/incidents with status counts (GET),
    or ingest error telemetry payloads from client SDKs (POST).
    Route: GET/POST /api/incidents/ or GET/POST /api/errors/
    """
    serializer_class = IncidentListSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Support POST on /api/errors/ and /api/incidents/ by delegating directly to UniversalIngestView.
        Eliminates HTTP 405 Method Not Allowed errors when SDKs or integrations send payloads to /api/errors/.
        """
        ingest_view = UniversalIngestView.as_view()
        return ingest_view(request._request, *args, **kwargs)

    def get_queryset(self):
        qs = Incident.objects.all().order_by("-created_at")
        if self.request.user.is_authenticated:
            # Filter to current user's errors if authenticated
            qs = qs.filter(Q(user=self.request.user) | Q(project__user=self.request.user))
        
        status_filter = self.request.query_params.get("status", "").upper()
        search_query = self.request.query_params.get("search", "")

        if status_filter and status_filter != "ALL":
            if status_filter == "UNRESOLVED":
                qs = qs.filter(status__in=["PENDING", "UNRESOLVED"])
            elif status_filter == "INVESTIGATING":
                qs = qs.filter(status__in=["ANALYZING", "INVESTIGATING"])
            else:
                qs = qs.filter(status=status_filter)

        if search_query:
            qs = qs.filter(
                Q(error_type__icontains=search_query)
                | Q(error_message__icontains=search_query)
                | Q(endpoint__icontains=search_query)
                | Q(project__name__icontains=search_query)
            )

        return qs

    def list(self, request, *args, **kwargs):
        # Base queryset for computing overall counts
        base_qs = Incident.objects.all()
        if request.user.is_authenticated:
            base_qs = base_qs.filter(Q(user=request.user) | Q(project__user=request.user))

        counts_qs = base_qs.values("status").annotate(count=Count("id"))
        counts = {row["status"]: row["count"] for row in counts_qs}
        total = sum(counts.values())

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset[:100], many=True)

        pending_cnt = counts.get("PENDING", 0) + counts.get("UNRESOLVED", 0)
        analyzing_cnt = counts.get("ANALYZING", 0) + counts.get("INVESTIGATING", 0)
        triaged_cnt = counts.get("TRIAGED", 0)
        resolved_cnt = counts.get("RESOLVED", 0)
        failed_cnt = counts.get("FAILED", 0) + counts.get("IGNORED", 0)

        return Response({
            "counts": {
                "total": total,
                "pending": pending_cnt,
                "unresolved": pending_cnt,
                "analyzing": analyzing_cnt,
                "investigating": analyzing_cnt,
                "triaged": triaged_cnt,
                "resolved": resolved_cnt,
                "failed": failed_cnt,
            },
            "results": serializer.data,
        })


class IncidentDetailView(generics.RetrieveUpdateAPIView):
    """
    Return or update full detail for a single incident.
    Route: GET/PATCH /api/incidents/<uuid:pk>/ or GET/PATCH /api/errors/<uuid:pk>/
    """
    serializer_class = IncidentDetailSerializer
    queryset = Incident.objects.all()
    lookup_field = "pk"
    permission_classes = [permissions.AllowAny]

    def patch(self, request, *args, **kwargs):
        incident = self.get_object()
        new_status = request.data.get("status")
        if new_status:
            incident.status = new_status
            incident.save(update_fields=["status", "updated_at"])
            # Sync corresponding ErrorLog if present
            ErrorLog.objects.filter(id=incident.id).update(status=new_status)
        serializer = self.get_serializer(incident)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Chaos testing endpoint
# ---------------------------------------------------------------------------

class ChaosTriggerView(APIView):
    """
    Endpoint to simulate production failures for testing AutoTrace triage.
    Usage: POST /api/chaos/trigger/?scenario=<type>
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        scenario = request.query_params.get("scenario", "zero_division")
        execute_chaos_scenario(scenario)
        return Response({"status": "Success", "message": f"Scenario {scenario} triggered."})