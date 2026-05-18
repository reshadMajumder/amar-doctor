import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from ..models import ChatRoom, ChatMessage
from ..services.messaging_service import MessagingService
from ..services.room_service import RoomService
from ..services.presence_service import PresenceService

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        # Validate membership and room existence
        self.room = await self.get_room()
        if not self.room or not await self.is_member():
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Update online status
        await self.update_presence(True)

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Update online status
            await self.update_presence(False)
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            event_type = data.get('event')
            payload = data.get('data', {})

            if event_type == 'chat.message':
                await self.handle_chat_message(payload)
            elif event_type == 'typing.start':
                await self.handle_typing(True)
            elif event_type == 'typing.stop':
                await self.handle_typing(False)
            elif event_type == 'message.read':
                await self.handle_mark_read(payload)
            elif event_type == 'consultation.start':
                await self.handle_lifecycle('start')
            elif event_type == 'consultation.end':
                await self.handle_lifecycle('end')
            elif event_type == 'call.signal':
                await self.handle_call_signal(payload)

        except Exception as e:
            await self.send(text_data=json.dumps({
                'event': 'error',
                'message': str(e)
            }))

    async def handle_chat_message(self, payload):
        content = payload.get('message')
        msg_type = payload.get('message_type', 'text')

        # 1. Persist before broadcast
        message = await self.save_message(content, msg_type)

        # 2. Broadcast
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message_broadcast',
                'message': {
                    'id': message.id,
                    'sender': {
                        'id': self.user.id,
                        'name': self.user.get_full_name() or self.user.email,
                        'role': self.user.role
                    },
                    'content': message.content,
                    'message_type': message.message_type,
                    'created_at': message.created_at.isoformat()
                }
            }
        )

    async def handle_typing(self, is_typing):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_broadcast',
                'user_id': self.user.id,
                'is_typing': is_typing
            }
        )

    async def handle_mark_read(self, payload):
        message_id = payload.get('message_id')
        await self.persist_read_receipt(message_id)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'read_receipt_broadcast',
                'message_id': message_id,
                'user_id': self.user.id
            }
        )

    async def handle_lifecycle(self, action):
        if self.user.role != 'doctor':
            return # Only doctor can start/end

        if action == 'start':
            await self.room_lifecycle_action('start')
            event = 'consultation.started'
        else:
            await self.room_lifecycle_action('end')
            event = 'consultation.completed'

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'lifecycle_broadcast',
                'event': event
            }
        )

    async def handle_call_signal(self, payload):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'call_signal_broadcast',
                'user_id': self.user.id,
                'signal': payload.get('signal')
            }
        )

    # Broadcast handlers
    async def chat_message_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'event': 'chat.message',
            'data': event['message']
        }))

    async def typing_broadcast(self, event):
        # Don't send back to the user who is typing
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'event': 'typing.status',
                'data': {
                    'user_id': event['user_id'],
                    'is_typing': event['is_typing']
                }
            }))

    async def read_receipt_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'event': 'message.read',
            'data': {
                'message_id': event['message_id'],
                'user_id': event['user_id']
            }
        }))

    async def lifecycle_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'event': event['event']
        }))

    async def call_signal_broadcast(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'event': 'call.signal',
                'data': {
                    'user_id': event['user_id'],
                    'signal': event['signal']
                }
            }))

    # Database sync methods
    @database_sync_to_async
    def get_room(self):
        try:
            return ChatRoom.objects.get(id=self.room_id)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def is_member(self):
        return self.room.patient == self.user or self.room.doctor == self.user

    @database_sync_to_async
    def save_message(self, content, msg_type):
        return MessagingService.persist_message(self.room, self.user, content, msg_type)

    @database_sync_to_async
    def persist_read_receipt(self, message_id):
        return MessagingService.mark_as_read(message_id, self.user)

    @database_sync_to_async
    def update_presence(self, is_online):
        return PresenceService.update_online_status(self.room, self.user, is_online)

    @database_sync_to_async
    def room_lifecycle_action(self, action):
        if action == 'start':
            return RoomService.start_consultation(self.room)
        else:
            return RoomService.end_consultation(self.room)
