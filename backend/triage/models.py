import uuid
from django.db import models

class Incident(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Triage'),
        ('ANALYZING', 'Analyzing with AI Agent'),
        ('TRIAGED', 'Triaged'),
        ('FAILED', 'Triage Failed'),
        ('RESOLVED', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    error_type = models.CharField(max_length=255)
    error_message = models.TextField()
    traceback = models.TextField()
    
    # Request telemetry (sanitized before storage)
    endpoint = models.CharField(max_length=500, blank=True, null=True)
    http_method = models.CharField(max_length=10, blank=True, null=True)
    request_payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    
    # Status & Triage Output
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    root_cause = models.TextField(blank=True, null=True)
    suggested_fix = models.TextField(blank=True, null=True)
    diagnostic_logs = models.JSONField(default=dict, blank=True)
    jira_key = models.CharField(max_length=50, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.status}] {self.error_type} ({self.id})"


class PostMortem(models.Model):
    """Historical knowledge base of resolved bugs used for vector similarity lookup."""
    title = models.CharField(max_length=255)
    error_signature = models.CharField(max_length=500)
    root_cause = models.TextField()
    resolution = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title