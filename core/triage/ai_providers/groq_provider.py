import json
from importlib import import_module

from django.conf import settings

from .base import BaseAIProvider


class GroqProvider(BaseAIProvider):
    def __init__(self, api_key=None):
        super().__init__(api_key)

        try:
            groq_module = import_module('groq')
        except ImportError as exc:  # pragma: no cover - exercised only when the optional dependency is missing
            raise RuntimeError(
                "The 'groq' package is required when DEFAULT_AI_PROVIDER=groq. "
                "Install it with `pip install groq`."
            ) from exc

        key = self.api_key or getattr(settings, 'GROQ_API_KEY', '')
        groq_client = groq_module.Groq
        self.client = groq_client(api_key=key) if key else groq_client()
        self.model_name = 'llama-3.3-70b-versatile'

    def _build_messages(self, prompt, system_instruction=None):
        messages = []
        if system_instruction:
            messages.append({
                'role': 'system',
                'content': system_instruction,
            })

        messages.append({
            'role': 'user',
            'content': prompt,
        })

        return messages

    def _create_completion(self, prompt, system_instruction=None, max_tokens=1000, temperature=0.7, response_format=None):
        request_kwargs = {
            'model': self.model_name,
            'messages': self._build_messages(prompt, system_instruction),
            'temperature': temperature,
            'max_completion_tokens': max_tokens,
            'top_p': 1,
            'stream': False,
        }

        if response_format is not None:
            request_kwargs['response_format'] = response_format

        try:
            return self.client.chat.completions.create(**request_kwargs)
        except Exception as e:
            fallback_model = 'meta-llama/llama-4-scout-17b-16e-instruct'
            # Prevent infinite recursion if the fallback model is already active
            if request_kwargs['model'] == fallback_model:
                raise e
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Groq API call failed with model '{self.model_name}': {e}. "
                f"Attempting fallback to '{fallback_model}'."
            )
            request_kwargs['model'] = fallback_model
            return self.client.chat.completions.create(**request_kwargs)

    @staticmethod
    def _extract_text(completion):
        if not completion or not getattr(completion, 'choices', None):
            return ''

        message = completion.choices[0].message
        return getattr(message, 'content', '') or ''

    def generate_response(self, prompt, system_instruction=None, max_tokens=1000, temperature=0.7):
        completion = self._create_completion(
            prompt=prompt,
            system_instruction=system_instruction,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return self._extract_text(completion)

    def generate_json(self, prompt, system_instruction=None, max_tokens=1000):
        completion = self._create_completion(
            prompt=prompt,
            system_instruction=system_instruction,
            max_tokens=max_tokens,
            temperature=0.1,
            response_format={'type': 'json_object'},
        )

        text = self._extract_text(completion)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            cleaned_text = text.strip()
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            return json.loads(cleaned_text.strip())