from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from accounts.models import AdminProfile

User = get_user_model()

@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'admin_role', 'created_at')
    list_filter = ('admin_role',)
    search_fields = ('user__email', 'user__full_name')

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = 'Admin Operational Profile'
    fk_name = 'user'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_verified', 'is_suspended', 'is_staff')
    list_filter = ('role', 'is_verified', 'is_suspended', 'is_staff', 'is_superuser')
    search_fields = ('email', 'full_name')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Platform Status', {'fields': ('role', 'is_verified', 'is_suspended', 'suspension_reason')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Platform Status', {'fields': ('role', 'is_verified', 'is_suspended', 'suspension_reason')}),
    )
    
    inlines = (AdminProfileInline,)
