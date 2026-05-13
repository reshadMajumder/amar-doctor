class BaseAIProvider:
    def __init__(self, api_key=None):
        self.api_key = api_key

    def generate_response(self, prompt, system_instruction=None, max_tokens=1000, temperature=0.7):
        """
        Generates a text response from the AI provider.
        Must be implemented by concrete classes.
        """
        raise NotImplementedError

    def generate_json(self, prompt, system_instruction=None, max_tokens=1000):
        """
        Generates a structured JSON response from the AI provider.
        Must be implemented by concrete classes.
        """
        raise NotImplementedError
