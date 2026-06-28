from django.db import models
from django.conf import settings
from decimal import Decimal
from appointments.models import Appointment

class PlatformSettings(models.Model):
    consultation_commission_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('15.00'),
        help_text="Default platform commission percentage (e.g. 15.00 for 15%)"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Platform Settings"

    @classmethod
    def get_commission_rate(cls):
        instance, created = cls.objects.get_or_create(pk=1)
        return instance.consultation_commission_percentage / Decimal('100.00')

class PaymentTransaction(models.Model):
    STATUS_INITIATED = 'initiated'
    STATUS_PAID_HELD = 'paid_held'
    STATUS_RELEASED = 'released'
    STATUS_REFUNDED = 'refunded'
    STATUS_FAILED = 'failed'
    STATUS_DISPUTED = 'disputed'

    STATUS_CHOICES = [
        (STATUS_INITIATED, 'Initiated'),
        (STATUS_PAID_HELD, 'Paid (Held in Escrow)'),
        (STATUS_RELEASED, 'Released to Doctor'),
        (STATUS_REFUNDED, 'Refunded to Patient'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_DISPUTED, 'Disputed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_transactions')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INITIATED, db_index=True)
    
    gateway_provider = models.CharField(max_length=50, default='sslcommerz')
    transaction_id = models.CharField(max_length=255, blank=True, null=True, db_index=True) # our local ID or gateway ID
    val_id = models.CharField(max_length=255, blank=True, null=True) # Gateway validation ID
    
    metadata = models.JSONField(default=dict, blank=True)
    
    held_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['appointment', 'status']),
        ]

    def __str__(self):
        return f"PaymentTx {self.id} - {self.user.email} - Appt#{self.appointment.id} - {self.status}"
