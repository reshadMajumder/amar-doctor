from django.conf import settings
from .gemini_provider import GeminiProvider

class AIProviderFactory:
    @staticmethod
    def get_provider(provider_name=None):
        name = provider_name or getattr(settings, 'DEFAULT_AI_PROVIDER', 'gemini')
        
        if name.lower() == 'gemini':
            return GeminiProvider()
        # elif name.lower() == 'openai':
        #     from .openai_provider import OpenAIProvider
        #     return OpenAIProvider()
        
        raise ValueError(f"Unknown AI Provider: {name}")
