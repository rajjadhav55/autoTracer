from rest_framework import serializers
from .models import Incident


class IncidentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the incidents table view."""

    class Meta:
        model = Incident
        fields = [
            "id",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "http_method",
            "created_at",
        ]


class IncidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for the incident detail drawer."""

    class Meta:
        model = Incident
        fields = [
            "id",
            "error_type",
            "error_message",
            "status",
            "endpoint",
            "http_method",
            "traceback",
            "root_cause",
            "suggested_fix",
            "request_payload",
            "headers",
            "diagnostic_logs",
            "jira_key",
            "created_at",
            "updated_at",
        ]
