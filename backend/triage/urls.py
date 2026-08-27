from django.urls import path
from .views import (
    ChaosTriggerView,
    IncidentDetailView,
    IncidentListView,
    UniversalIngestView,
    ingest_error_event,
)

urlpatterns = [
    # Dashboard API — consumed by the React frontend
    path('incidents/', IncidentListView.as_view(), name='incident-list'),
    path('incidents/<uuid:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    # Universal SDK ingestion endpoint — receives error payloads from multi-language SDKs
    path('ingest/', UniversalIngestView.as_view(), name='universal-ingest'),
    # Chaos testing endpoint
    path('chaos/trigger/', ChaosTriggerView.as_view(), name='chaos-trigger'),
]
