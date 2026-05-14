from accounts.models import DoctorProfile


def get_pending_doctors():
    """Returns DoctorProfiles awaiting verification."""
    return DoctorProfile.objects.filter(
        verification_status='pending'
    ).select_related('user').order_by('user__created_at')


def get_doctor_profile_detail(doctor_profile_id: int):
    return DoctorProfile.objects.select_related('user', 'verified_by').get(pk=doctor_profile_id)


def get_doctors_by_status(status: str):
    return DoctorProfile.objects.filter(
        verification_status=status
    ).select_related('user', 'verified_by').order_by('-user__created_at')


def get_all_doctors():
    return DoctorProfile.objects.select_related(
        'user', 'verified_by'
    ).order_by('-user__created_at')
