import secrets
import uuid
from django.db import models


class Project(models.Model):
    """Multi-tenant project model for client SDK authentication and incident scoping."""
    name = models.CharField(max_length=255)
    api_key = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.api_key:
            while True:
                candidate = f"autotrace_pk_{secrets.token_hex(20)}"
                if not Project.objects.filter(api_key=candidate).exists():
                    self.api_key = candidate
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.api_key[:18]}...)"


class Incident(models.Model):
    """Captured application exception / crash report."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending Triage'),
        ('ANALYZING', 'Analyzing with AI Agent'),
        ('TRIAGED', 'Triaged'),
        ('FAILED', 'Triage Failed'),
        ('RESOLVED', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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