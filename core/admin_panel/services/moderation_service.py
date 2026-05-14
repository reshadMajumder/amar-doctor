import logging
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from audit_logs.services.audit_log_service import AuditLogService
from audit_logs.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


class ModerationService:
    """
    Operational moderation tools for managing platform users.
    All actions are audited and trigger appropriate notifications.
    """

    @staticmethod
    @transaction.atomic
    def suspend_user(user_id: int, admin_user, reason: str, request=None) -> User:
        """
        Suspends a user account. Suspended users cannot book or join consultations.
        """
        user = User.objects.get(pk=user_id)

        if user.is_suspended:
            raise ValueError(f"User #{user_id} is already suspended.")
        if user.role == 'admin':
            raise ValueError("Admin users cannot be suspended via moderation.")

        previous_data = {
            'is_suspended': False,
            'suspension_reason': user.suspension_reason,
        }

        user.is_suspended = True
        user.suspension_reason = reason
        user.suspended_at = timezone.now()
        user.suspended_by = admin_user
        user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by'])

        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_SUSPENSION,
            target_obj=user,
            previous_data=previous_data,
            new_data={'is_suspended': True, 'reason': reason},
            request=request,
            reason=reason,
        )

        ModerationService._notify_user(
            user=user,
            title='Your account has been suspended',
            message=f'Your account has been suspended. Reason: {reason}. Please contact support.',
        )

        logger.warning("User suspended: user_id=%s by admin=%s", user_id, admin_user.email)
        return user

    @staticmethod
    @transaction.atomic
    def unsuspend_user(user_id: int, admin_user, request=None) -> User:
        """
        Lifts suspension from a user account.
        """
        user = User.objects.get(pk=user_id)

        if not user.is_suspended:
            raise ValueError(f"User #{user_id} is not currently suspended.")

        previous_data = {
            'is_suspended': True,
            'suspension_reason': user.suspension_reason,
        }

        user.is_suspended = False
        user.suspension_reason = None
        user.suspended_at = None
        user.suspended_by = None
        user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by'])

        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_UNSUSPENSION,
            target_obj=user,
            previous_data=previous_data,
            new_data={'is_suspended': False},
            request=request,
        )

        ModerationService._notify_user(
            user=user,
            title='Your account suspension has been lifted',
            message='Your account has been reinstated. You can now use the platform normally.',
        )

        logger.info("User unsuspended: user_id=%s by admin=%s", user_id, admin_user.email)
        return user

    @staticmethod
    @transaction.atomic
    def deactivate_user(user_id: int, admin_user, reason: str = '', request=None) -> User:
        """
        Permanently deactivates a user account (soft delete via is_active=False).
        """
        user = User.objects.get(pk=user_id)

        if not user.is_active:
            raise ValueError(f"User #{user_id} is already deactivated.")
        if user.role == 'admin':
            raise ValueError("Admin users cannot be deactivated via moderation.")

        previous_data = {'is_active': True}

        user.is_active = False
        user.save(update_fields=['is_active'])

        AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_DEACTIVATION,
            target_obj=user,
            previous_data=previous_data,
            new_data={'is_active': False},
            request=request,
            reason=reason,
        )

        logger.warning("User deactivated: user_id=%s by admin=%s", user_id, admin_user.email)
        return user

    @staticmethod
    def flag_suspicious_activity(user_id: int, admin_user, notes: str, request=None):
        """
        Flags a user for suspicious activity without modifying their account.
        Creates an audit trail for review.
        """
        user = User.objects.get(pk=user_id)

        log = AuditLogService.log(
            actor=admin_user,
            action_type=AuditLog.ACTION_FLAG,
            target_obj=user,
            request=request,
            notes=notes,
            flagged_by=admin_user.email,
        )

        logger.warning("User flagged for suspicious activity: user_id=%s by admin=%s", user_id, admin_user.email)
        return log

    @staticmethod
    def _notify_user(user, title: str, message: str):
        try:
            from notifications.services.notification_service import NotificationService
            NotificationService.create_notification(
                recipient=user,
                n_type='system',
                title=title,
                message=message,
                payload={'source': 'moderation'},
            )
        except Exception as exc:
            logger.error("Failed to notify user %s: %s", user.email, exc)
