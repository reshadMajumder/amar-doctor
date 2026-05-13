from django.db import models
from django.conf import settings
from .appointment import Appointment

class AppointmentStatusLog(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='status_logs'
    )
    previous_status = models.CharField(max_length=20, choices=Appointment.STATUS_CHOICES)
    new_status = models.CharField(max_length=20, choices=Appointment.STATUS_CHOICES)
    
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reason = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Log {self.appointment.booking_reference}: {self.previous_status} -> {self.new_status}"
