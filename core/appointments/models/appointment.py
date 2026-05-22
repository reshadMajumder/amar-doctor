import uuid
from django.db import models
from django.conf import settings
from triage.models import AIReport

class Appointment(models.Model):
    CONSULTATION_TYPE_CHOICES = (
        ('text', 'Text Consultation'),
        ('video', 'Video Consultation'),
        ('voice', 'Voice Consultation'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('doctor_approved', 'Approved by Doctor'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
        ('missed', 'Missed'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Unpaid'),
        ('paid_held', 'Paid (Escrow)'),
        ('released', 'Released to Doctor'),
        ('refunded', 'Refunded'),
        ('disputed', 'Disputed'),
    )

    booking_reference = models.CharField(max_length=12, unique=True, db_index=True)
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments_as_patient'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments_as_doctor'
    )
    
    ai_report = models.OneToOneField(
        AIReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointment'
    )
    
    consultation_type = models.CharField(
        max_length=20,
        choices=CONSULTATION_TYPE_CHOICES,
        default='text'
    )
    
    scheduled_start = models.DateTimeField(db_index=True)
    scheduled_end = models.DateTimeField()
    timezone = models.CharField(max_length=50, default='UTC')
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid'
    )
    
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    
    cancellation_reason = models.TextField(blank=True, null=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_appointments'
    )
    
    notes = models.TextField(blank=True, null=True)
    no_prescription_required = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_start']
        indexes = [
            models.Index(fields=['doctor', 'scheduled_start', 'status']),
            models.Index(fields=['patient', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.booking_reference:
            import secrets
            self.booking_reference = secrets.token_hex(6).upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Appt {self.booking_reference}: {self.patient.full_name} -> {self.doctor.full_name}"
