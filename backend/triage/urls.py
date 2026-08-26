from django.urls import path
from .views import (
    ChaosTriggerView,
    IncidentDetailView,
    IncidentListView,
    ingest_error_event,
)

urlpatterns = [
    # Dashboard API — consumed by the React frontend
    path('incidents/', IncidentListView.as_view(), name='incident-list'),
    path('incidents/<uuid:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    # SDK ingestion endpoint — receives error payloads from client middleware
    path('ingest/', ingest_error_event, name='ingest-error-event'),
    # Chaos testing endpoint
    path('chaos/trigger/', ChaosTriggerView.as_view(), name='chaos-trigger'),
]
