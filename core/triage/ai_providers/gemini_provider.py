import json
from google import genai
from google.genai import types
from django.conf import settings
from .base import BaseAIProvider

class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key=None):
        super().__init__(api_key)
        # Fallback to settings if api_key not provided
        key = self.api_key or getattr(settings, 'GEMINI_API_KEY', '')
        self.client = genai.Client(api_key=key)
        # Use the configured Gemini text model
        self.model_name = 'gemini-3.1-flash-lite'

    def generate_response(self, prompt, system_instruction=None, max_tokens=1000, temperature=0.7):
        config_kwargs = {
            "max_output_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
            
        config = types.GenerateContentConfig(**config_kwargs)
        
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config
        )
        return response.text

    def generate_json(self, prompt, system_instruction=None, max_tokens=1000):
        config_kwargs = {
            "max_output_tokens": max_tokens,
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
            
        config = types.GenerateContentConfig(**config_kwargs)

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config
        )
        
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback parsing if JSON isn't perfect
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
            return json.loads(text.strip())
