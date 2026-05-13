from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from triage.models import AITriageSession, AITriageMessage
from triage.ai_providers.factory import AIProviderFactory
from triage.prompts.templates import SYSTEM_INSTRUCTION, FOLLOW_UP_PROMPT
from .emergency_service import EmergencyService
from .report_service import ReportService

class AIOrchestrator:
    def __init__(self):
        self.ai_provider = AIProviderFactory.get_provider()
        self.emergency_service = EmergencyService()
        self.report_service = ReportService()
        self.channel_layer = get_channel_layer()

    def _broadcast_to_room(self, session_id, event_type, payload):
        room_group_name = f'triage_{session_id}'
        async_to_sync(self.channel_layer.group_send)(
            room_group_name,
            {
                'type': 'triage.event', # Must match the method name in TriageConsumer
                'payload': {
                    'event': event_type,
                    'data': payload
                }
            }
        )

    def process_patient_message(self, session_id, message_id):
        session = AITriageSession.objects.get(id=session_id)
        msg = AITriageMessage.objects.get(id=message_id)

        # 1. Emergency Detection
        is_emergency, reason, risk_level = self.emergency_service.check_emergency(msg.content)
        
        if is_emergency:
            session.emergency_detected = True
            session.risk_level = risk_level
            session.save()
            
            AITriageMessage.objects.create(
                session=session,
                sender_type='system',
                message_type='warning',
                content=reason,
                metadata={'risk_level': risk_level}
            )
            self._broadcast_to_room(session.id, 'ai.emergency', {
                'message': "Emergency symptoms detected. Seek immediate care.",
                'reason': reason
            })
            
            # Immediately generate report
            report = self.report_service.generate_report(session.id)
            self._broadcast_to_room(session.id, 'report.generated', {
                'report_id': report.id
            })
            return

        # 2. Build History for Follow Up
        history_msgs = AITriageMessage.objects.filter(session=session).order_by('created_at')
        history_text = "\n".join([f"{m.sender_type.capitalize()}: {m.content}" for m in history_msgs])

        # 3. Generate Follow Up Question or Decide to Finish
        prompt = FOLLOW_UP_PROMPT.format(history=history_text, message=msg.content)
        
        try:
            response_json = self.ai_provider.generate_json(
                prompt=prompt,
                system_instruction=SYSTEM_INSTRUCTION,
                max_tokens=300
            )
            
            has_enough_info = response_json.get('has_enough_info', False)
            question = response_json.get('question', '')

            if has_enough_info or session.current_step >= 10: # Cap at 10 steps to avoid infinite loops
                # Generate Report
                self._broadcast_to_room(session.id, 'ai.processing', {'status': 'Generating final report'})
                report = self.report_service.generate_report(session.id)
                self._broadcast_to_room(session.id, 'report.generated', {
                    'report_id': report.id
                })
            else:
                # Save and Send Follow Up
                session.current_step += 1
                session.status = 'waiting_for_patient'
                session.save()

                AITriageMessage.objects.create(
                    session=session,
                    sender_type='ai',
                    message_type='follow_up_question',
                    content=question
                )
                
                self._broadcast_to_room(session.id, 'ai.question', {
                    'question': question
                })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error processing AI follow up: {e}")
            self._broadcast_to_room(session.id, 'system.error', {
                'message': 'There was an error processing your request. Please try again.'
            })
            session.status = 'waiting_for_patient'
            session.save()
