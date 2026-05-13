import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from triage.models import AITriageSession, AITriageMessage
from triage.tasks.ai_tasks import process_patient_message_task

class TriageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        print(f"DEBUG: WebSocket connect. User: {self.user}")
        if self.user.is_anonymous:
            print("DEBUG: Anonymous user rejected.")
            await self.close(code=4001)
            return

        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'triage_{self.session_id}'

        # Validate session ownership or permissions
        if not await self.validate_session_access():
            print(f"DEBUG: Session access rejected for session {self.session_id}")
            await self.close(code=4003)
            return
        
        print(f"DEBUG: Connection accepted for session {self.session_id}")

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "event": "system.error",
                "data": {"message": "Invalid format. Please send a JSON object with 'event' and 'data'."}
            }))
            return

        event = data.get('event')
        payload = data.get('data', {})

        if event in ['session.start', 'patient.answer']:
            message_content = payload.get('symptoms') or payload.get('message')
            if not message_content:
                return

            # Save message synchronously before handing off to celery
            msg = await self.save_message(
                sender_type='patient',
                message_type='symptom' if event == 'session.start' else 'answer',
                content=message_content
            )

            # Send processing state immediately
            await self.send(text_data=json.dumps({
                "event": "ai.processing",
                "data": {"status": "Analyzing symptoms"}
            }))

            # Dispatch Celery Task (non-blocking)
            process_patient_message_task.delay(self.session_id, msg.id)

    # Handlers for messages broadcast from Celery/Redis
    async def triage_event(self, event):
        """
        Generic handler for messages sent from channel_layer.group_send.
        Expects event dict: {"type": "triage.event", "payload": {"event": "...", "data": {...}}}
        """
        payload = event.get('payload', {})
        await self.send(text_data=json.dumps(payload))

    @database_sync_to_async
    def validate_session_access(self):
        try:
            session = AITriageSession.objects.get(id=self.session_id)
            if self.user.role == 'patient' and session.patient_id != self.user.id:
                return False
            return True
        except AITriageSession.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, sender_type, message_type, content):
        session = AITriageSession.objects.get(id=self.session_id)
        # Update session state to active processing
        session.status = 'ai_processing'
        session.save()
        
        return AITriageMessage.objects.create(
            session=session,
            sender_type=sender_type,
            message_type=message_type,
            content=content
        )
