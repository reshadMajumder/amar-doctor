from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_APPOINTMENT = 'appointment'
    TYPE_CONSULTATION = 'consultation'
    TYPE_PAYMENT = 'payment'
    TYPE_PRESCRIPTION = 'prescription'
    TYPE_SYSTEM = 'system'
    
    TYPE_CHOICES = (
        (TYPE_APPOINTMENT, 'Appointment Update'),
        (TYPE_CONSULTATION, 'Consultation Update'),
        (TYPE_PAYMENT, 'Payment Update'),
        (TYPE_PRESCRIPTION, 'Prescription Ready'),
        (TYPE_SYSTEM, 'System Notification'),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at']),
        ]

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title}"

class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences')
    
    email_enabled = models.BooleanField(default=True)
    websocket_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=False) # Future ready
    
    appointment_notifications = models.BooleanField(default=True)
    consultation_notifications = models.BooleanField(default=True)
    payment_notifications = models.BooleanField(default=True)
    prescription_notifications = models.BooleanField(default=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"
