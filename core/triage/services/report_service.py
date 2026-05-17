from triage.models import AITriageSession, AITriageMessage, AIReport
from triage.ai_providers.factory import AIProviderFactory
from triage.prompts.templates import SYSTEM_INSTRUCTION, REPORT_GENERATION_PROMPT

class ReportService:
    def __init__(self):
        self.ai_provider = AIProviderFactory.get_provider()

    def get_available_specializations(self):
        from django.core.cache import cache
        from accounts.models import DoctorProfile

        specializations = cache.get('doctor_specializations')
        if not specializations:
            queryset = DoctorProfile.objects.filter(verification_status='approved', is_available=True)
            if not queryset.exists():
                # Sandbox fallback to fetch all profiles
                queryset = DoctorProfile.objects.all()

            specializations = list(queryset.values_list('specialization', flat=True).distinct())
            
            if "General Physician" not in specializations:
                specializations.append("General Physician")
                
            cache.set('doctor_specializations', specializations, timeout=3600)
            
        return specializations

    def generate_report(self, session_id):
        session = AITriageSession.objects.get(id=session_id)
        messages = AITriageMessage.objects.filter(session=session).order_by('created_at')
        
        history_text = "\n".join([f"{msg.sender_type.capitalize()}: {msg.content}" for msg in messages])
        
        specs = self.get_available_specializations()
        specs_str = ", ".join([f'"{s}"' for s in specs])
        
        prompt = REPORT_GENERATION_PROMPT.format(
            available_specializations=specs_str,
            history=history_text
        )
        
        try:
            report_data = self.ai_provider.generate_json(
                prompt=prompt,
                system_instruction=SYSTEM_INSTRUCTION,
                max_tokens=1500
            )
            
            # Save report
            report = AIReport.objects.create(
                session=session,
                patient=session.patient,
                extracted_symptoms=report_data.get('extracted_symptoms', []),
                symptom_duration=report_data.get('symptom_duration', 'Unknown'),
                severity_level=report_data.get('severity_level', 'Unknown'),
                follow_up_answers=report_data.get('follow_up_answers', {}),
                emergency_flags=report_data.get('emergency_flags', []),
                ai_summary=report_data.get('ai_summary', ''),
                risk_category=report_data.get('risk_category', 'low'),
                recommended_specialization=report_data.get('recommended_specialization', 'General'),
                triage_score=report_data.get('triage_score', 0.0),
                ai_confidence_score=report_data.get('ai_confidence_score', 0.0)
            )
            
            # Update session status
            session.status = 'completed'
            if report_data.get('risk_category') == 'emergency':
                session.risk_level = 'emergency'
                session.emergency_detected = True
            session.save()
            
            return report
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to generate report for session {session_id}: {e}")
            raise
