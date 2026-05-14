from rest_framework.permissions import BasePermission


def _get_admin_profile(user):
    """Safe helper — returns AdminProfile or None without raising."""
    try:
        return user.admin_profile
    except Exception:
        return None


class IsAnyAdmin(BasePermission):
    """
    Grants access to any authenticated user with role='admin' and a valid AdminProfile.
    Used for read-only admin endpoints (dashboard, audit logs).
    """
    message = 'Admin access required.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role != 'admin':
            return False
        return _get_admin_profile(request.user) is not None


class IsSuperAdmin(BasePermission):
    """Full platform control — no restrictions."""
    message = 'Super admin access required.'

    def has_permission(self, request, view):
        profile = _get_admin_profile(request.user) if (request.user and request.user.is_authenticated) else None
        if not profile:
            return False
        return profile.admin_role == 'super_admin'


class IsOperationsAdmin(BasePermission):
    """
    Super admin or operations admin.
    Can manage doctors, users, moderation.
    """
    message = 'Operations admin access required.'
    ALLOWED_ROLES = {'super_admin', 'operations_admin'}

    def has_permission(self, request, view):
        profile = _get_admin_profile(request.user) if (request.user and request.user.is_authenticated) else None
        if not profile:
            return False
        return profile.admin_role in self.ALLOWED_ROLES


class IsFinanceAdmin(BasePermission):
    """
    Super admin or finance admin.
    Can view financial data, flag payouts.
    """
    message = 'Finance admin access required.'
    ALLOWED_ROLES = {'super_admin', 'finance_admin'}

    def has_permission(self, request, view):
        profile = _get_admin_profile(request.user) if (request.user and request.user.is_authenticated) else None
        if not profile:
            return False
        return profile.admin_role in self.ALLOWED_ROLES


class IsSupportAdmin(BasePermission):
    """
    Super admin or support admin.
    Can view users, open disputes.
    """
    message = 'Support admin access required.'
    ALLOWED_ROLES = {'super_admin', 'support_admin'}

    def has_permission(self, request, view):
        profile = _get_admin_profile(request.user) if (request.user and request.user.is_authenticated) else None
        if not profile:
            return False
        return profile.admin_role in self.ALLOWED_ROLES


class IsDoctorVerificationAdmin(BasePermission):
    """
    Super admin or doctor_verification_admin.
    Can approve/reject/suspend doctors.
    """
    message = 'Doctor verification admin access required.'
    ALLOWED_ROLES = {'super_admin', 'doctor_verification_admin'}

    def has_permission(self, request, view):
        profile = _get_admin_profile(request.user) if (request.user and request.user.is_authenticated) else None
        if not profile:
            return False
        return profile.admin_role in self.ALLOWED_ROLES
