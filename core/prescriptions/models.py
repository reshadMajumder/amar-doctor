from django.db import models
from django.conf import settings
from appointments.models import Appointment

class Prescription(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_FINALIZED = 'finalized'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = (
        (STATUS_DRAFT, 'Draft'),
        (STATUS_FINALIZED, 'Finalized'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='prescription')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_prescriptions')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='issued_prescriptions')
    
    diagnosis_notes = models.TextField(blank=True)
    advice_notes = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    
    issued_at = models.DateTimeField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Prescription {self.id} for {self.patient.email}"

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    
    medicine_name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True)
    
    dosage = models.CharField(max_length=100) # e.g. 500mg
    frequency = models.CharField(max_length=100) # e.g. 1+0+1
    duration = models.CharField(max_length=100) # e.g. 7 days
    
    instruction = models.CharField(max_length=255, blank=True) # e.g. after meals
    quantity = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage}"

class PrescriptionAttachment(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='prescriptions/attachments/%Y/%m/%d/')
    attachment_type = models.CharField(max_length=50, default='report')
    created_at = models.DateTimeField(auto_now_add=True)
