from django.urls import path
from .views import ChaosTriggerView, ingest_error_event

urlpatterns = [
    # SDK ingestion endpoint — receives error payloads from client middleware
    path('ingest/', ingest_error_event, name='ingest-error-event'),
    # Chaos testing endpoint
    path('chaos/trigger/', ChaosTriggerView.as_view(), name='chaos-trigger'),
]