from django.db import transaction
from ..models import Notification, NotificationPreference

class NotificationService:
    @staticmethod
    @transaction.atomic
    def create_notification(recipient, n_type, title, message, payload=None):
        """
        Creates a persistent notification and triggers delivery channels based on preferences.
        """
        # Ensure preferences exist
        prefs, _ = NotificationPreference.objects.get_or_create(user=recipient)
        
        # Check if this type is enabled (future: more granular checks)
        # For now, we always persist if the general preference is ON.
        
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=n_type,
            title=title,
            message=message,
            payload=payload or {}
        )
        
        # Dispatch to channels
        NotificationService.dispatch(notification, prefs)
        
        return notification

    @staticmethod
    def dispatch(notification, prefs):
        """
        Orchestrates delivery across WebSocket, Email, etc.
        """
        # 1. Realtime WebSocket
        if prefs.websocket_enabled:
            from .websocket_notification_service import WebSocketNotificationService
            WebSocketNotificationService.broadcast_to_user(notification)
            
        # 2. Email (Async via Celery)
        if prefs.email_enabled:
            from ..tasks import send_notification_email_task
            send_notification_email_task.delay(notification.id)
            
        # 3. Push (Future)
        pass
