from django.contrib import admin
from django.contrib import admin
from .models import Incident

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    # This tells the admin panel which columns to show in the table
    list_display = ('id', 'status', 'error_type', 'created_at', 'root_cause')
    list_filter = ('status', 'error_type')
    readonly_fields = ('created_at',)
# Register your models here.
