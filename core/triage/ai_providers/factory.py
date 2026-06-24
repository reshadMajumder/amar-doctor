from django.conf import settings
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider

class AIProviderFactory:
    @staticmethod
    def get_provider(provider_name=None):
        name = (provider_name or getattr(settings, 'DEFAULT_AI_PROVIDER', 'groq')).strip().lower()
        
        if name == 'gemini':
            return GeminiProvider()
        if name == 'groq':
            return GroqProvider()
        
        raise ValueError(f"Unknown AI Provider: {name}")
