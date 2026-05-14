from django.contrib import admin
from django.utils.html import format_html
from accounts.models import DoctorProfile
from admin_panel.services.doctor_verification_service import DoctorVerificationService

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ('get_name', 'specialization', 'verification_status', 'is_available', 'verification_actions')
    list_filter = ('verification_status', 'is_available', 'specialization')
    search_fields = ('user__full_name', 'user__email', 'bmdc_number')
    readonly_fields = ('verified_by', 'verified_at')
    
    def get_name(self, obj):
        return obj.user.full_name
    get_name.short_description = 'Doctor Name'
    
    def verification_actions(self, obj):
        if obj.verification_status == 'pending':
            return format_html(
                '<a class="button" href="{}">Quick Review</a>',
                f'/api/v1/admin/doctors/{obj.id}/'
            )
        return obj.verification_status
    verification_actions.short_description = 'Verification'

    def save_model(self, request, obj, form, change):
        # We prefer using the Service layer for verification, 
        # but standard admin edits are still allowed for superadmins.
        super().save_model(request, obj, form, change)
