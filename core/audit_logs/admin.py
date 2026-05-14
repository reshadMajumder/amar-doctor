from django.contrib import admin
from audit_logs.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'actor_email', 'action_type', 'target_model',
        'target_id', 'ip_address', 'created_at'
    ]
    list_filter = ['action_type', 'target_model', 'created_at']
    search_fields = ['actor__email', 'target_model', 'ip_address', 'metadata']
    date_hierarchy = 'created_at'
    readonly_fields = [
        'actor', 'action_type', 'target_model', 'target_id',
        'previous_data', 'new_data', 'ip_address', 'user_agent',
        'metadata', 'created_at'
    ]
    ordering = ['-created_at']

    def actor_email(self, obj):
        return obj.actor.email if obj.actor else '(system)'
    actor_email.short_description = 'Actor'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
