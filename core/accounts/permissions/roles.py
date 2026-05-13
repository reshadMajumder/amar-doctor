from rest_framework.permissions import BasePermission

class IsPatient(BasePermission):
    """
    Allows access only to verified patients.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'patient' and request.user.is_verified)

class IsDoctor(BasePermission):
    """
    Allows access only to verified doctors.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'doctor' and request.user.is_verified)

class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')
