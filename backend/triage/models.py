import secrets
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


def generate_api_key():
    """Generate a high-entropy, prefixed API key for AutoTrace SDK client authentication."""
    return f"autotrace_pk_{secrets.token_hex(20)}"


class User(AbstractUser):
    """
    Custom User model with an auto-generated unique API tracking key.
    Allows SDK clients to report errors linked directly to this account.
    """
    email = models.EmailField(unique=True)
    api_key = models.CharField(
        max_length=64,
        unique=True,
        default=generate_api_key,
        editable=False,
        db_index=True,
        help_text="Unique API tracking key used by SDK clients to report errors."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    REQUIRED_FIELDS = ['email']

    def regenerate_api_key(self):
        """Regenerate a new unique API tracking key."""
        while True:
            candidate = generate_api_key()
            if not User.objects.filter(api_key=candidate).exists():
                self.api_key = candidate
                self.save(update_fields=['api_key'])
                return self.api_key

    def __str__(self):
        return f"{self.username} ({self.email})"


class Project(models.Model):
    """Multi-tenant project model for client SDK authentication and incident scoping."""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='projects',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    api_key = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.api_key:
            while True:
                candidate = generate_api_key()
                if not Project.objects.filter(api_key=candidate).exists():
                    self.api_key = candidate
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.api_key[:18]}...)"


class ErrorLog(models.Model):
    """
    Core ErrorLog model storing captured application exceptions,
    stack trace strings, error messages, and timestamps.
    """
    STATUS_CHOICES = [
        ('UNRESOLVED', 'Unresolved'),
        ('INVESTIGATING', 'Investigating'),
        ('RESOLVED', 'Resolved'),
        ('IGNORED', 'Ignored'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='error_logs',
        null=True,
        blank=True,
        help_text="The user account that owns the application reporting the error."
    )
    application_name = models.CharField(max_length=255, db_index=True, default='default-app')
    error_type = models.CharField(max_length=255, db_index=True)
    error_message = models.TextField()
    stack_trace = models.TextField(help_text="Stack trace string.")
    endpoint = models.CharField(max_length=500, blank=True, null=True, default='')
    environment = models.CharField(max_length=64, default='production', db_index=True)
    runtime = models.CharField(max_length=64, default='python', blank=True)
    context_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNRESOLVED', db_index=True)
    root_cause = models.TextField(blank=True, null=True)
    suggested_fix = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'application_name']),
        ]

    def __str__(self):
        return f"[{self.application_name}] {self.error_type}: {self.error_message[:40]}"


class Incident(models.Model):
    """Captured application exception / crash report for automated AI triage."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending Triage'),
        ('ANALYZING', 'Analyzing with AI Agent'),
        ('TRIAGED', 'Triaged'),
        ('FAILED', 'Triage Failed'),
        ('RESOLVED', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incidents',
        null=True,
        blank=True,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='incidents',
        null=True,
        blank=True,
    )
    error_type = models.CharField(max_length=255)
    error_message = models.TextField()
    endpoint = models.CharField(max_length=500, blank=True, null=True)
    runtime = models.CharField(max_length=50, blank=True, null=True, default='python')
    traceback = models.JSONField(default=list, blank=True)
    context_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    root_cause = models.TextField(blank=True, null=True)
    suggested_fix = models.TextField(blank=True, null=True)

    # Legacy / extra telemetry metadata
    http_method = models.CharField(max_length=10, blank=True, null=True)
    request_payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    diagnostic_logs = models.JSONField(default=dict, blank=True)
    jira_key = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def application_name(self):
        if self.project:
            return self.project.name
        if isinstance(self.context_data, dict) and self.context_data.get('service'):
            return self.context_data.get('service')
        return 'default-app'

    def __str__(self):
        proj_name = self.project.name if self.project else "No Project"
        return f"[{self.status}] {self.error_type} ({proj_name} - {self.id})"


class PostMortem(models.Model):
    """Historical knowledge base of resolved bugs used for vector similarity lookup."""
    title = models.CharField(max_length=255)
    error_signature = models.CharField(max_length=500)
    root_cause = models.TextField()
    resolution = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title