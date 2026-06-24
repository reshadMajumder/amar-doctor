import pytest
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from triage.models import AITriageSession, AITriageMessage, AIReport
from triage.ai_providers.factory import AIProviderFactory
from triage.ai_providers.groq_provider import GroqProvider
from triage.services.ai_orchestrator import AIOrchestrator
from triage.services.emergency_service import EmergencyService
from triage.services.report_service import ReportService

User = get_user_model()

@pytest.fixture
def patient():
    return User.objects.create_user(email="testpatient@test.com", password="password123", full_name="Test", role="patient", is_verified=True)

@pytest.fixture
def session(patient):
    return AITriageSession.objects.create(patient=patient)

@pytest.fixture
def auth_client(patient):
    client = APIClient()
    client.force_authenticate(user=patient)
    return client

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

    @patch('triage.services.ai_orchestrator.get_channel_layer')
    @patch('triage.ai_providers.factory.AIProviderFactory.get_provider')
    def test_emergency_triggers_immediate_report(self, mock_get_provider, mock_channel_layer, session):
        mock_channel_layer.return_value.group_send = AsyncMock()
        mock_provider = mock_get_provider.return_value
        
        mock_provider.generate_json.side_effect = [
            {"is_emergency": True, "reason": "Severe chest pain", "risk_level": "emergency"}, # Emergency Check
            { # Report Generation
                "extracted_symptoms": ["chest pain"],
                "risk_category": "emergency",
                "ai_summary": "Emergency",
                "recommended_specialization": "ER"
            }
        ]
        
        msg = AITriageMessage.objects.create(session=session, sender_type='patient', message_type='symptom', content="My chest hurts bad")
        
        orchestrator = AIOrchestrator()
        orchestrator.process_patient_message(session.id, msg.id)
        
        session.refresh_from_db()
        assert session.emergency_detected is True
        assert session.status == 'completed'
        assert hasattr(session, 'report')

@pytest.mark.django_db
class TestTriageReportService:
    @patch('triage.ai_providers.factory.AIProviderFactory.get_provider')
    def test_generate_report_success(self, mock_get_provider, session):
        mock_provider = mock_get_provider.return_value
        mock_provider.generate_json.return_value = {
            "extracted_symptoms": ["headache", "nausea"],
            "symptom_duration": "2 days",
            "severity_level": "moderate",
            "follow_up_answers": {"nausea": "yes"},
            "emergency_flags": [],
            "ai_summary": "Patient has persistent headache.",
            "risk_category": "medium",
            "recommended_specialization": "Neurology",
            "triage_score": 65.5,
            "ai_confidence_score": 0.9
        }
        
        service = ReportService()
        report = service.generate_report(session.id)
        
        assert isinstance(report, AIReport)
        assert report.session == session
        assert report.risk_category == "medium"
        
        session.refresh_from_db()
        assert session.status == 'completed'


class TestAIProviderFactoryRouting:
    @patch('triage.ai_providers.groq_provider.Groq')
    @override_settings(DEFAULT_AI_PROVIDER='groq')
    def test_factory_returns_groq_provider(self, mock_groq):
        mock_groq.return_value.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='{"ok": true}'))]
        )

        provider = AIProviderFactory.get_provider()

        assert isinstance(provider, GroqProvider)

    @patch('triage.ai_providers.groq_provider.Groq')
    def test_groq_provider_generates_text(self, mock_groq):
        mock_groq.return_value.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='Yes, that is concerning.'))]
        )

        provider = GroqProvider(api_key='test-key')
        response = provider.generate_response(
            prompt='I have chest pain',
            system_instruction='You are a medical triage assistant.',
            max_tokens=256,
            temperature=0.3,
        )

        assert response == 'Yes, that is concerning.'
        mock_groq.return_value.chat.completions.create.assert_called_once()

        call_kwargs = mock_groq.return_value.chat.completions.create.call_args.kwargs
        assert call_kwargs['model'] == 'llama-3.3-70b-versatile'
        assert call_kwargs['max_completion_tokens'] == 256
        assert call_kwargs['temperature'] == 0.3
        assert call_kwargs['messages'][0]['role'] == 'system'
        assert call_kwargs['messages'][1]['role'] == 'user'

    @patch('triage.ai_providers.groq_provider.Groq')
    def test_groq_provider_generates_json(self, mock_groq):
        mock_groq.return_value.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='{"is_emergency": false, "risk_level": "low"}'))]
        )

        provider = GroqProvider(api_key='test-key')
        response = provider.generate_json(prompt='Return JSON only')

        assert response == {'is_emergency': False, 'risk_level': 'low'}
        call_kwargs = mock_groq.return_value.chat.completions.create.call_args.kwargs
        assert call_kwargs['response_format'] == {'type': 'json_object'}

@pytest.mark.django_db
class TestTriageAPI:
    def test_create_session(self, auth_client):
        url = reverse('triage-session-list')
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True

    def test_list_sessions(self, auth_client, session):
        url = reverse('triage-session-list')
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_patient_cannot_see_other_sessions(self, auth_client, patient):
        other_patient = User.objects.create_user(email="other@test.com", password="password123", full_name="Other")
        other_session = AITriageSession.objects.create(patient=other_patient)
        
        url = reverse('triage-session-detail', args=[other_session.id])
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
