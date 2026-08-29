from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Incident, Project, ErrorLog

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration with automatic API tracking key assignment."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "api_key", "created_at"]
        read_only_fields = ["id", "api_key", "created_at"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile and API key inspection."""
    class Meta:
        model = User
        fields = ["id", "username", "email", "api_key", "created_at"]
        read_only_fields = ["id", "email", "api_key", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""
    class Meta:
        model = Project
        fields = ["id", "name", "api_key", "created_at"]
        read_only_fields = ["api_key", "created_at"]


class ErrorIngestionSerializer(serializers.Serializer):
    """
    Validates incoming SDK error payloads and maps them to both ErrorLog & Incident.
    Compatible with autotrace-py and autotrace-node payloads.
    """
    application_name = serializers.CharField(max_length=255, required=False, default="")
    error_type = serializers.CharField(max_length=255, required=False, default="")
    error_message = serializers.CharField(required=False, default="")
    traceback = serializers.JSONField(required=False, default=list)
    stack_trace = serializers.CharField(required=False, default="")
    endpoint = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    runtime = serializers.CharField(max_length=64, required=False, default="python")
    context = serializers.JSONField(required=False, default=dict)
    environment = serializers.CharField(max_length=64, required=False, default="production")

    def validate(self, attrs):
        # Support nested payload structure if passed under 'exception'
        initial = self.initial_data
        if not attrs.get("error_type"):
            attrs["error_type"] = (
                initial.get("error_type")
                or initial.get("exception", {}).get("type")
                or "UnknownException"
            )
        if not attrs.get("error_message"):
            attrs["error_message"] = (
                initial.get("error_message")
                or initial.get("exception", {}).get("message")
                or ""
            )
        if not attrs.get("endpoint"):
            attrs["endpoint"] = (
                initial.get("endpoint")
                or initial.get("request", {}).get("path")
                or ""
            )
        if not attrs.get("runtime"):
            attrs["runtime"] = (
                initial.get("runtime")
                or initial.get("sdk", {}).get("name")
                or "python"
            )
        return attrs


class ErrorLogSerializer(serializers.ModelSerializer):
    """Serializer for dashboard error logs."""
    class Meta:
        model = ErrorLog
        fields = [
            "id",
            "application_name",
            "error_type",
            "error_message",
            "stack_trace",
            "endpoint",
            "environment",
            "runtime",
            "context_data",
            "status",
            "root_cause",
            "suggested_fix",
            "timestamp",
            "updated_at",
        ]
        read_only_fields = ["id", "timestamp", "updated_at"]


class IncidentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the incidents table view."""
    project_name = serializers.CharField(source="project.name", default="", read_only=True)
    application_name = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id",
            "project",
            "project_name",
            "application_name",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "runtime",
            "http_method",
            "created_at",
        ]

    def get_application_name(self, obj):
        return obj.application_name


class IncidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for the incident detail drawer and AI triage."""
    project_name = serializers.CharField(source="project.name", default="", read_only=True)
    application_name = serializers.SerializerMethodField()
    stack_trace = serializers.SerializerMethodField()
    ai_duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id",
            "project",
            "project_name",
            "application_name",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "runtime",
            "http_method",
            "traceback",
            "stack_trace",
            "context_data",
            "root_cause",
            "suggested_fix",
            "ai_duration_seconds",
            "request_payload",
            "headers",
            "diagnostic_logs",
            "jira_key",
            "created_at",
            "updated_at",
        ]

    def get_application_name(self, obj):
        return obj.application_name

    def get_stack_trace(self, obj):
        if isinstance(obj.traceback, list):
            return "\n".join(str(f) for f in obj.traceback)
        return str(obj.traceback or "")

    def get_ai_duration_seconds(self, obj):
        if isinstance(obj.diagnostic_logs, dict) and "triage_duration_seconds" in obj.diagnostic_logs:
            val = obj.diagnostic_logs["triage_duration_seconds"]
            try:
                return round(float(val), 2)
            except (ValueError, TypeError):
                pass
        if obj.status in ("TRIAGED", "FAILED") and obj.created_at and obj.updated_at:
            diff = (obj.updated_at - obj.created_at).total_seconds()
            if 0 < diff < 3600:
                return round(diff, 2)
        return None
