import re
from triage.ai_providers.factory import AIProviderFactory
from triage.prompts.templates import SYSTEM_INSTRUCTION, EMERGENCY_DETECTION_PROMPT

class EmergencyService:
    EMERGENCY_KEYWORDS = [
        r'\bchest pain\b', r'\bheart attack\b', r'\bstroke\b', r'\bcan\'t breathe\b',
        r'\bchoking\b', r'\bunconscious\b', r'\bsevere bleeding\b', r'\bsuicid(e|al)\b',
        r'\bkill myself\b', r'\bpassing out\b', r'\bseizure\b', r'\bnot breathing\b'
    ]

    def __init__(self):
        self.ai_provider = AIProviderFactory.get_provider()

    def check_emergency(self, message_content):
        """
        Hybrid check: Rules based first, then AI classification.
        Returns (is_emergency, reason, risk_level)
        """
        # 1. Rule-based check
        content_lower = message_content.lower()
        for pattern in self.EMERGENCY_KEYWORDS:
            if re.search(pattern, content_lower):
                return True, "Triggered by high-risk keywords", "emergency"

        # 2. AI check
        prompt = EMERGENCY_DETECTION_PROMPT.format(message=message_content)
        try:
            response_json = self.ai_provider.generate_json(
                prompt=prompt,
                system_instruction=SYSTEM_INSTRUCTION,
                max_tokens=200
            )
            is_emergency = response_json.get('is_emergency', False)
            reason = response_json.get('reason', '')
            risk_level = response_json.get('risk_level', 'low')
            
            # Ensure risk level is valid
            if risk_level not in ['low', 'medium', 'high', 'emergency']:
                risk_level = 'low'
                
            return is_emergency, reason, risk_level
        except Exception as e:
            # Fallback on error: assume not emergency but log it
            return False, str(e), "medium"
