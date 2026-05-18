from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm as BaseUserCreationForm, UserChangeForm as BaseUserChangeForm
from accounts.models import AdminProfile

User = get_user_model()

class UserCreationForm(BaseUserCreationForm):
    class Meta(BaseUserCreationForm.Meta):
        model = User
        fields = ('email', 'full_name', 'role')
        field_classes = {}

class UserChangeForm(BaseUserChangeForm):
    class Meta(BaseUserChangeForm.Meta):
        model = User
        fields = '__all__'
        field_classes = {}

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
    form = UserChangeForm
    add_form = UserCreationForm
    
    list_display = ('email', 'full_name', 'role', 'is_verified', 'is_suspended', 'is_staff')
    list_filter = ('role', 'is_verified', 'is_suspended', 'is_staff', 'is_superuser')
    search_fields = ('email', 'full_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Platform Status', {
            'fields': ('role', 'is_verified', 'is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by')
        }),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'suspended_at', 'suspended_by')
    
    inlines = (AdminProfileInline,)

