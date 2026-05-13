from django.db import models
from django.conf import settings
from .room import ChatRoom

class ChatParticipantState(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participant_states')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_states')
    
    is_online = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(auto_now=True)
    typing_status = models.BooleanField(default=False)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('room', 'user')

    def __str__(self):
        return f"{self.user.email} in Room {self.room_id} (Online: {self.is_online})"
