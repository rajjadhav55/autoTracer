import logging
from rest_framework import authentication, exceptions
from django.contrib.auth import get_user_model
from .models import Project

logger = logging.getLogger(__name__)
User = get_user_model()


class SDKAPIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticates incoming SDK telemetry requests using the unique API Key.
    
    Supports:
      1. 'X-API-Key' header (e.g. autotrace_pk_...)
      2. 'Authorization: Bearer autotrace_pk_...' header
      3. 'X-AutoTrace-Key' header
    """
    def authenticate(self, request):
        api_key = (
            request.headers.get("X-API-Key")
            or request.headers.get("x-api-key")
            or request.META.get("HTTP_X_API_KEY", "")
            or request.headers.get("X-AutoTrace-Key")
            or request.META.get("HTTP_X_AUTOTRACE_KEY", "")
        )

        if not api_key:
            auth_header = request.headers.get("Authorization", "") or request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.startswith("Bearer "):
                candidate = auth_header.split(" ")[1].strip()
                if candidate.startswith("autotrace_pk_"):
                    api_key = candidate

        if not api_key:
            return None  # Pass to next authentication backend

        api_key = api_key.strip()

        # 1. Match User account directly by api_key
        try:
            user = User.objects.get(api_key=api_key)
            return (user, None)
        except User.DoesNotExist:
            pass

        # 2. Match Project by api_key (backward compatibility with project keys)
        try:
            project = Project.objects.get(api_key=api_key)
            if project.user:
                return (project.user, None)
            
            # Fallback: get or create an owner user for orphan projects
            fallback_user, _ = User.objects.get_or_create(
                username=f"proj_{project.name.lower().replace(' ', '_')}",
                defaults={"email": f"{project.name.lower().replace(' ', '_')}@autotrace.local"}
            )
            project.user = fallback_user
            project.save(update_fields=['user'])
            return (fallback_user, None)
        except Project.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid API tracking key provided.")
