from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Incident, Project, ErrorLog, PostMortem


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'api_key', 'is_staff', 'created_at')
    readonly_fields = ('api_key', 'created_at')
    search_fields = ('username', 'email', 'api_key')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('AutoTrace SDK Credentials', {'fields': ('api_key', 'created_at')}),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'api_key', 'created_at')
    readonly_fields = ('api_key', 'created_at')
    search_fields = ('name', 'api_key')


@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'application_name', 'error_type', 'environment', 'status', 'user', 'timestamp')
    list_filter = ('status', 'environment', 'runtime', 'application_name')
    readonly_fields = ('id', 'timestamp', 'updated_at')
    search_fields = ('application_name', 'error_type', 'error_message', 'stack_trace')


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
