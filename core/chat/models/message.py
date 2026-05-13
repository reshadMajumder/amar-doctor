from django.db import models
from django.conf import settings
from .room import ChatRoom

class ChatMessage(models.Model):
    TYPE_TEXT = 'text'
    TYPE_SYSTEM = 'system'
    TYPE_PRESCRIPTION = 'prescription'
    TYPE_CONSULTATION_EVENT = 'consultation_event'
    TYPE_IMAGE = 'image'
    TYPE_FILE = 'file'
    
    TYPE_CHOICES = (
        (TYPE_TEXT, 'Text Message'),
        (TYPE_SYSTEM, 'System Notification'),
        (TYPE_PRESCRIPTION, 'Prescription Shared'),
        (TYPE_CONSULTATION_EVENT, 'Consultation Lifecycle Event'),
        (TYPE_IMAGE, 'Image Attachment'),
        (TYPE_FILE, 'File Attachment'),
    )

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='sent_messages')
    
    message_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_TEXT)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
        ]

    def __str__(self):
        sender_name = self.sender.email if self.sender else "System"
        return f"Message {self.id} from {sender_name} in Room {self.room_id}"
