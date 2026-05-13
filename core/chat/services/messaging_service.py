from django.utils import timezone
from django.db import transaction
from ..models import ChatMessage, ChatRoom

class MessagingService:
    @staticmethod
    @transaction.atomic
    def persist_message(room, sender, content, message_type='text', metadata=None):
        """
        Persists a message to the database before broadcasting.
        """
        # Room must be active or waiting (not ended/cancelled) to accept patient/doctor messages
        if room.status in [ChatRoom.STATUS_ENDED, ChatRoom.STATUS_CANCELLED] and message_type != 'system':
            raise ValueError("Cannot send messages in an inactive room.")

        message = ChatMessage.objects.create(
            room=room,
            sender=sender,
            message_type=message_type,
            content=content,
            metadata=metadata or {}
        )
        return message

    @staticmethod
    @transaction.atomic
    def mark_as_read(message_id, user):
        """
        Marks a specific message as read by the participant.
        """
        try:
            message = ChatMessage.objects.select_for_update().get(id=message_id)
            
            # Only the OTHER participant can mark as read
            if message.sender == user:
                return message
                
            if not message.is_read:
                message.is_read = True
                message.read_at = timezone.now()
                message.save()
            return message
        except ChatMessage.DoesNotExist:
            return None

    @staticmethod
    def get_room_messages(room, limit=50, cursor=None):
        """
        Retrieves messages with cursor-based pagination.
        """
        queryset = ChatMessage.objects.filter(room=room).order_by('-created_at')
        if cursor:
            queryset = queryset.filter(id__lt=cursor)
            
        return queryset[:limit]
