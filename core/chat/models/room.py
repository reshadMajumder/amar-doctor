from django.db import models
from django.conf import settings
from appointments.models import Appointment

class ChatRoom(models.Model):
    TYPE_TEXT = 'text'
    TYPE_VIDEO = 'video'
    TYPE_VOICE = 'voice'
    
    TYPE_CHOICES = (
        (TYPE_TEXT, 'Text Consultation'),
        (TYPE_VIDEO, 'Video Consultation'),
        (TYPE_VOICE, 'Voice Consultation'),
    )

    STATUS_WAITING = 'waiting'
    STATUS_ACTIVE = 'active'
    STATUS_ENDED = 'ended'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = (
        (STATUS_WAITING, 'Waiting for Doctor'),
        (STATUS_ACTIVE, 'Ongoing Consultation'),
        (STATUS_ENDED, 'Consultation Completed'),
        (STATUS_CANCELLED, 'Consultation Cancelled'),
    )

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='chat_room')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_chat_rooms')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_chat_rooms')
    
    consultation_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_TEXT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAITING)
    
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Room {self.id} (Appt #{self.appointment.id})"
