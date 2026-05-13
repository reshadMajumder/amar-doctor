from celery import shared_task
from google.genai.errors import ServerError
from triage.services.ai_orchestrator import AIOrchestrator

@shared_task(
    autoretry_for=(ServerError,),
    retry_backoff=True,
    max_retries=5,
    retry_jitter=True
)
def process_patient_message_task(session_id, message_id):
    orchestrator = AIOrchestrator()
    orchestrator.process_patient_message(session_id, message_id)
