from django.contrib import admin
from admin_panel.models.dispute import ConsultationDispute

@admin.register(ConsultationDispute)
class ConsultationDisputeAdmin(admin.ModelAdmin):
    list_display = ('id', 'appointment', 'opened_by', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reason', 'resolution_notes', 'opened_by__email')
    readonly_fields = ('created_at', 'updated_at', 'resolved_at', 'resolved_by')
    
    def save_model(self, request, obj, form, change):
        if 'status' in form.changed_data and obj.status in ['resolved', 'rejected']:
            from django.utils import timezone
            obj.resolved_by = request.user
            obj.resolved_at = timezone.now()
        super().save_model(request, obj, form, change)
