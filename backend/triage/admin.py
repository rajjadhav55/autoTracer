from django.contrib import admin
from .models import Incident, Project, PostMortem


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'api_key', 'created_at')
    readonly_fields = ('api_key', 'created_at')
    search_fields = ('name', 'api_key')


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'status', 'error_type', 'runtime', 'endpoint', 'created_at')
    list_filter = ('status', 'error_type', 'runtime', 'project')
    readonly_fields = ('created_at', 'updated_at')
    search_fields = ('error_type', 'error_message', 'endpoint')


@admin.register(PostMortem)
class PostMortemAdmin(admin.ModelAdmin):
    list_display = ('title', 'error_signature', 'created_at')
    search_fields = ('title', 'error_signature', 'root_cause')
