from django.db import models
from django.conf import settings
from appointments.models import Appointment


class ConsultationDispute(models.Model):
    """
    Foundation architecture for future consultation dispute resolution.
    Phase 7: Model + status transitions only. No full workflow yet.
    """
    STATUS_OPEN = 'open'
    STATUS_INVESTIGATING = 'investigating'
    STATUS_RESOLVED = 'resolved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = (
        (STATUS_OPEN, 'Open'),
        (STATUS_INVESTIGATING, 'Under Investigation'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='disputes'
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='opened_disputes'
    )

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
        db_index=True
    )

    resolution_notes = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_disputes'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['appointment', 'status']),
        ]
        verbose_name = 'Consultation Dispute'
        verbose_name_plural = 'Consultation Disputes'

    def __str__(self):
        return f"Dispute #{self.id} — Appt#{self.appointment.id} [{self.status}]"

    @property
    def is_open(self):
        return self.status in (self.STATUS_OPEN, self.STATUS_INVESTIGATING)
