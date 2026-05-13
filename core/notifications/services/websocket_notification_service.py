from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

class WebSocketNotificationService:
    @staticmethod
    def broadcast_to_user(notification):
        """
        Sends a realtime notification to the user's personal notification group.
        """
        channel_layer = get_channel_layer()
        group_name = f"notifications_{notification.recipient.id}"
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'notification': {
                    'id': notification.id,
                    'type': notification.notification_type,
                    'title': notification.title,
                    'message': notification.message,
                    'payload': notification.payload,
                    'created_at': notification.created_at.isoformat()
                }
            }
        )
