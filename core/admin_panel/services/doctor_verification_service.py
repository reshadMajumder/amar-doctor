import logging
from django.utils import timezone
from django.db import transaction

from accounts.models import DoctorProfile
from audit_logs.services.audit_log_service import AuditLogService
from audit_logs.models import AuditLog

logger = logging.getLogger(__name__)


class DoctorVerificationService:
    """
    Orchestrates the full doctor verification lifecycle.
    All actions are audited and trigger notifications.
    """

    @staticmethod
    @transaction.atomic
    def approve_doctor(doctor_profile_id: int, admin_user, notes: str = '', request=None) -> DoctorProfile:
        """
        Approves a pending doctor.
        - Sets verification_status = 'approved'
        - Marks doctor user as is_verified = True
        - Sets is_available = True
        - Emits notification
        - Writes audit log
        """
        profile = DoctorProfile.objects.select_related('user').get(pk=doctor_profile_id)

        if profile.verification_status == 'approved':
            raise ValueError(f"Doctor #{doctor_profile_id} is already approved.")

        previous_data = {
            'verification_status': profile.verification_status,
            'is_verified': profile.user.is_verified,
        }

        # Update profile
        profile.verification_status = 'approved'
        profile.verification_notes = notes
        profile.verified_by = admin_user
        profile.verified_at = timezone.now()
        profile.is_available = True
        profile.save(update_fields=[
            'verification_status', 'verification_notes',
            'verified_by', 'verified_at', 'is_available'
        ])

        # Mark the user as verified
        profile.user.is_verified = True
        profile.user.save(update_fields=['is_verified'])

        new_data = {
            'verification_status': 'approved',
            'is_verified': True,
            'verified_by': admin_user.email,
            'verified_at': profile.verified_at.isoformat(),
        }

        # Audit log
        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_APPROVE,
            target_obj=profile,
            previous_data=previous_data,
            new_data=new_data,
            request=request,
            notes=notes,
            admin_role=getattr(getattr(admin_user, 'admin_profile', None), 'admin_role', 'unknown'),
        )

        # Notification
        DoctorVerificationService._notify_doctor(
            doctor_user=profile.user,
            title='Your account has been approved!',
            message=(
                f'Congratulations! Your doctor account has been approved. '
                f'You can now accept patient consultations. Notes: {notes}' if notes
                else 'Congratulations! Your doctor account has been approved. You can now accept patient consultations.'
            ),
        )

        logger.info("Doctor approved: profile_id=%s by admin=%s", doctor_profile_id, admin_user.email)
        return profile

    @staticmethod
    @transaction.atomic
    def reject_doctor(doctor_profile_id: int, admin_user, notes: str = '', request=None) -> DoctorProfile:
        """
        Rejects a pending/approved doctor.
        - Sets verification_status = 'rejected'
        - Marks is_available = False
        - Marks user is_verified = False
        """
        profile = DoctorProfile.objects.select_related('user').get(pk=doctor_profile_id)

        previous_data = {
            'verification_status': profile.verification_status,
            'is_verified': profile.user.is_verified,
        }

        profile.verification_status = 'rejected'
        profile.verification_notes = notes
        profile.verified_by = admin_user
        profile.verified_at = timezone.now()
        profile.is_available = False
        profile.save(update_fields=[
            'verification_status', 'verification_notes',
            'verified_by', 'verified_at', 'is_available'
        ])

        profile.user.is_verified = False
        profile.user.save(update_fields=['is_verified'])

        new_data = {
            'verification_status': 'rejected',
            'is_verified': False,
            'notes': notes,
        }

        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_REJECT,
            target_obj=profile,
            previous_data=previous_data,
            new_data=new_data,
            request=request,
            notes=notes,
        )

        DoctorVerificationService._notify_doctor(
            doctor_user=profile.user,
            title='Your account verification was not approved',
            message=(
                f'Unfortunately, your doctor account could not be approved at this time. '
                f'Reason: {notes}' if notes else
                'Unfortunately, your doctor account could not be approved. Please contact support.'
            ),
        )

        logger.info("Doctor rejected: profile_id=%s by admin=%s", doctor_profile_id, admin_user.email)
        return profile

    @staticmethod
    @transaction.atomic
    def suspend_doctor(doctor_profile_id: int, admin_user, reason: str, request=None) -> DoctorProfile:
        """
        Suspends an approved doctor.
        - Sets DoctorProfile.verification_status = 'suspended'
        - Sets User.is_suspended = True
        - Sets is_available = False
        """
        from django.utils import timezone as tz
        profile = DoctorProfile.objects.select_related('user').get(pk=doctor_profile_id)

        previous_data = {
            'verification_status': profile.verification_status,
            'is_suspended': profile.user.is_suspended,
        }

        profile.verification_status = 'suspended'
        profile.is_available = False
        profile.verification_notes = reason
        profile.save(update_fields=['verification_status', 'is_available', 'verification_notes'])

        user = profile.user
        user.is_suspended = True
        user.suspension_reason = reason
        user.suspended_at = tz.now()
        user.suspended_by = admin_user
        user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by'])

        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_SUSPENSION,
            target_obj=profile,
            previous_data=previous_data,
            new_data={'verification_status': 'suspended', 'is_suspended': True},
            request=request,
            reason=reason,
        )

        DoctorVerificationService._notify_doctor(
            doctor_user=profile.user,
            title='Your account has been suspended',
            message=f'Your doctor account has been suspended. Reason: {reason}. Please contact support.',
        )

        logger.warning("Doctor suspended: profile_id=%s by admin=%s reason=%s", doctor_profile_id, admin_user.email, reason)
        return profile

    @staticmethod
    def _notify_doctor(doctor_user, title: str, message: str):
        """Send notification to doctor user — swallows exceptions so verification flow is not blocked."""
        try:
            from notifications.services.notification_service import NotificationService
            NotificationService.create_notification(
                recipient=doctor_user,
                n_type='system',
                title=title,
                message=message,
                payload={'source': 'doctor_verification'},
            )
        except Exception as exc:
            logger.error("Failed to notify doctor %s: %s", doctor_user.email, exc)
