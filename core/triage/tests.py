import pytest
from unittest.mock import patch, AsyncMock
from django.contrib.auth import get_user_model
from triage.models import AITriageSession, AITriageMessage, AIReport
from triage.services.ai_orchestrator import AIOrchestrator
from triage.services.emergency_service import EmergencyService

User = get_user_model()

@pytest.fixture
def patient():
    return User.objects.create_user(email="testpatient@test.com", password="password", full_name="Test", role="patient", is_verified=True)

@pytest.fixture
def session(patient):
    return AITriageSession.objects.create(patient=patient)

@pytest.mark.django_db
class TestEmergencyService:
    def test_rule_based_emergency(self):
        service = EmergencyService()
        is_emergency, reason, risk = service.check_emergency("I have severe chest pain right now")
        assert is_emergency is True
        assert risk == "emergency"
        assert "high-risk keywords" in reason

    @patch('triage.ai_providers.factory.AIProviderFactory.get_provider')
    def test_ai_based_emergency(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        mock_provider.generate_json.return_value = {
            "is_emergency": True,
            "reason": "Patient indicates a potential stroke",
            "risk_level": "emergency"
        }
        
        service = EmergencyService()
        is_emergency, reason, risk = service.check_emergency("My face is drooping and my left arm is numb")
        
        assert is_emergency is True
        assert risk == "emergency"
        assert reason == "Patient indicates a potential stroke"

@pytest.mark.django_db
class TestAIOrchestrator:
    @patch('triage.services.ai_orchestrator.get_channel_layer')
    @patch('triage.ai_providers.factory.AIProviderFactory.get_provider')
    def test_follow_up_generation(self, mock_get_provider, mock_channel_layer, session):
        mock_channel_layer.return_value.group_send = AsyncMock()
        mock_provider = mock_get_provider.return_value
        # Mock Emergency Check (Not emergency)
        mock_provider.generate_json.side_effect = [
            {"is_emergency": False, "reason": "", "risk_level": "low"}, # Emergency Check
            {"question": "How long have you had this headache?", "has_enough_info": False} # Follow Up
        ]
        
        msg = AITriageMessage.objects.create(session=session, sender_type='patient', message_type='symptom', content="I have a headache")
        
        orchestrator = AIOrchestrator()
        orchestrator.process_patient_message(session.id, msg.id)
        
        # Verify AI sent a follow up question
        ai_msg = AITriageMessage.objects.filter(session=session, sender_type='ai').first()
        assert ai_msg is not None
        assert ai_msg.message_type == 'follow_up_question'
        assert ai_msg.content == "How long have you had this headache?"
        
        # Verify Session State
        session.refresh_from_db()
        assert session.status == 'waiting_for_patient'
        assert session.current_step == 2
