from .adapters.sslcommerz import SSLCommerzAdapter

def get_adapter(provider: str = 'sslcommerz'):
    provider = provider.lower()
    if provider == 'sslcommerz':
        return SSLCommerzAdapter()
    raise ValueError(f"Unsupported provider: {provider}")
