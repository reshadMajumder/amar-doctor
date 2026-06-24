from django.conf import settings
from .groq_provider import GroqProvider

class AIProviderFactory:
    @staticmethod
    def get_provider(provider_name=None):
        # Triage currently uses Groq only; ignore any legacy provider value.
        return GroqProvider()
