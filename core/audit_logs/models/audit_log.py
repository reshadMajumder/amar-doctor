from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Immutable, append-only audit log for all sensitive platform operations.
    Never update or delete via API — only read and create via AuditLogService.
    """
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    ACTION_APPROVE = 'approve'
    ACTION_REJECT = 'reject'
    ACTION_REFUND = 'refund'
    ACTION_PAYOUT = 'payout'
    ACTION_SUSPENSION = 'suspension'
    ACTION_UNSUSPENSION = 'unsuspension'
    ACTION_LOGIN = 'login'
    ACTION_EXPORT = 'export'
    ACTION_FLAG = 'flag'
    ACTION_DEACTIVATION = 'deactivation'

    ACTION_TYPE_CHOICES = (
        (ACTION_CREATE, 'Create'),
        (ACTION_UPDATE, 'Update'),
        (ACTION_DELETE, 'Delete'),
        (ACTION_APPROVE, 'Approve'),
        (ACTION_REJECT, 'Reject'),
        (ACTION_REFUND, 'Refund'),
        (ACTION_PAYOUT, 'Payout'),
        (ACTION_SUSPENSION, 'Suspension'),
        (ACTION_UNSUSPENSION, 'Unsuspension'),
        (ACTION_LOGIN, 'Login'),
        (ACTION_EXPORT, 'Export'),
        (ACTION_FLAG, 'Flag'),
        (ACTION_DEACTIVATION, 'Deactivation'),
    )

    # Who performed the action (null if system/anonymous)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions',
        db_index=True,
    )

    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPE_CHOICES,
        db_index=True
    )

    # Target model name (e.g., 'DoctorProfile', 'User', 'PaymentTransaction')
    target_model = models.CharField(max_length=100, db_index=True)
    target_id = models.BigIntegerField(null=True, blank=True, db_index=True)

    # State snapshots — JSON for maximum flexibility
    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')

    # Arbitrary extra context (e.g., reason, notes, admin_role)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', 'action_type']),
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['action_type', 'created_at']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        actor_label = self.actor.email if self.actor else 'system'
        return f"[{self.action_type.upper()}] {actor_label} on {self.target_model}#{self.target_id} @ {self.created_at}"

    # Prevent accidental mutation via Django ORM
    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditLog records are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog records are immutable and cannot be deleted.")
