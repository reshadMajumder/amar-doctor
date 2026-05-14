import logging
from audit_logs.models import AuditLog

logger = logging.getLogger(__name__)


class AuditLogService:
    """
    Central service for creating immutable audit log records.
    Always silent on failure — never raise exceptions that would block business logic.
    """

    @staticmethod
    def log(
        actor,
        action_type: str,
        target_obj=None,
        target_model: str = None,
        target_id: int = None,
        previous_data: dict = None,
        new_data: dict = None,
        request=None,
        **metadata
    ) -> 'AuditLog | None':
        """
        Create an audit log entry.

        Args:
            actor: User instance or None (system actions)
            action_type: One of AuditLog.ACTION_* constants
            target_obj: Optional Django model instance (target_model and target_id derived automatically)
            target_model: Explicit model name override
            target_id: Explicit target PK override
            previous_data: Snapshot of state before action
            new_data: Snapshot of state after action
            request: Django request object for IP/user-agent extraction
            **metadata: Any extra key-value context (reason, admin_role, etc.)

        Returns:
            AuditLog instance or None on failure
        """
        try:
            # Derive target info from object if provided
            if target_obj is not None:
                if target_model is None:
                    target_model = type(target_obj).__name__
                if target_id is None:
                    target_id = getattr(target_obj, 'pk', None)

            ip_address = None
            user_agent = ''

            if request is not None:
                ip_address = AuditLogService._get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]

            # Validate action type exists in choices
            valid_actions = [choice[0] for choice in AuditLog.ACTION_TYPE_CHOICES]
            if action_type not in valid_actions:
                logger.error(f"Invalid action_type provided: {action_type}")
                return None

            log_entry = AuditLog(
                actor=actor,
                action_type=action_type,
                target_model=target_model or '',
                target_id=target_id,
                previous_data=previous_data,
                new_data=new_data,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata=metadata or {},
            )
            log_entry.save()
            return log_entry

        except Exception as exc:
            # Audit logging must NEVER block business operations
            logger.error(
                "AuditLogService failed to create log: %s | actor=%s action=%s target=%s#%s",
                exc, actor, action_type, target_model, target_id,
                exc_info=True
            )
            return None

    @staticmethod
    def _get_client_ip(request) -> str | None:
        """Extract real client IP, honoring X-Forwarded-For."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def log_approval(actor, target_obj, notes: str = '', request=None):
        return AuditLogService.log(
            actor=actor,
            action_type=AuditLog.ACTION_APPROVE,
            target_obj=target_obj,
            request=request,
            notes=notes,
        )

    @staticmethod
    def log_rejection(actor, target_obj, notes: str = '', request=None):
        return AuditLogService.log(
            actor=actor,
            action_type=AuditLog.ACTION_REJECT,
            target_obj=target_obj,
            request=request,
            notes=notes,
        )

    @staticmethod
    def log_suspension(actor, target_obj, reason: str = '', request=None):
        return AuditLogService.log(
            actor=actor,
            action_type=AuditLog.ACTION_SUSPENSION,
            target_obj=target_obj,
            request=request,
            reason=reason,
        )

    @staticmethod
    def log_update(actor, target_obj, previous_data: dict, new_data: dict, request=None):
        return AuditLogService.log(
            actor=actor,
            action_type=AuditLog.ACTION_UPDATE,
            target_obj=target_obj,
            previous_data=previous_data,
            new_data=new_data,
            request=request,
        )
