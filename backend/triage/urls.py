from django.urls import path
from .views import ChaosTriggerView

urlpatterns = [
    # This maps the specific path to your class-based view
    path('chaos/trigger/', ChaosTriggerView.as_view(), name='chaos-trigger'),
]