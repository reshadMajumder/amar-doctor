import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from appointments.models import Appointment

class AppointmentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close(code=4001)
            return

        # Users join their own personal group for notifications
        self.user_group_name = f'user_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    # Handler for appointment events
    async def appointment_event(self, event):
        """
        Expects event format:
        {
            "type": "appointment_event",
            "event_type": "appointment.created",
            "data": { ... }
        }
        """
        await self.send(text_data=json.dumps({
            'event': event['event_type'],
            'data': event['data']
        }))
