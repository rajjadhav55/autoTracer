from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    ChaosTriggerView,
    IncidentDetailView,
    IncidentListView,
    RegenerateAPIKeyView,
    RegisterView,
    SportsCategoryView,
    UniversalIngestView,
    UserProfileView,
)

urlpatterns = [
    # ── Authentication & User Profile ──────────────────────────────
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', UserProfileView.as_view(), name='auth-me'),
    path('auth/regenerate-key/', RegenerateAPIKeyView.as_view(), name='auth-regenerate-key'),

    # ── Universal SDK Error Ingestion ──────────────────────────────
    path('ingest/', UniversalIngestView.as_view(), name='universal-ingest'),
    path('errors/ingest/', UniversalIngestView.as_view(), name='error-ingest'),

    # ── Sports & Turfs Telemetry Exception Trigger ─────────────────
    path('sports/', SportsCategoryView.as_view(), name='sports-category'),
    path('sports/turfs/', SportsCategoryView.as_view(), name='sports-turfs'),

    # ── User Dashboard & Telemetry Stream ──────────────────────────
    path('errors/', IncidentListView.as_view(), name='error-list'),
    path('errors/<uuid:pk>/', IncidentDetailView.as_view(), name='error-detail'),
    path('incidents/', IncidentListView.as_view(), name='incident-list'),
    path('incidents/<uuid:pk>/', IncidentDetailView.as_view(), name='incident-detail'),

    # ── Chaos Simulation ───────────────────────────────────────────
    path('chaos/trigger/', ChaosTriggerView.as_view(), name='chaos-trigger'),
]