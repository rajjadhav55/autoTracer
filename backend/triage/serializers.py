from rest_framework import serializers
from .models import Incident, Project


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""
    class Meta:
        model = Project
        fields = ["id", "name", "api_key", "created_at"]
        read_only_fields = ["api_key", "created_at"]


class IncidentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the incidents table view."""
    project_name = serializers.CharField(source="project.name", default="", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id",
            "project",
            "project_name",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "runtime",
            "http_method",
            "created_at",
        ]


class IncidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for the incident detail drawer."""
    project_name = serializers.CharField(source="project.name", default="", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id",
            "project",
            "project_name",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "runtime",
            "http_method",
            "traceback",
            "context_data",
            "root_cause",
            "suggested_fix",
            "request_payload",
            "headers",
            "diagnostic_logs",
            "jira_key",
            "created_at",
            "updated_at",
        ]
