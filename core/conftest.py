import pytest
from django.conf import settings

@pytest.hookimpl(tryfirst=True)
def pytest_configure(config):
    settings.DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()
