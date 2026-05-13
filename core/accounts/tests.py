import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestAuthFlows:
    @pytest.fixture(autouse=True)
    def override_settings(self, settings):
        settings.CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            }
        }
        settings.CELERY_TASK_ALWAYS_EAGER = True
        settings.CELERY_BROKER_URL = 'memory://'
        settings.CELERY_RESULT_BACKEND = 'cache+memory://'

    def setup_method(self):
        cache.clear()

    def test_patient_registration(self, api_client):
        url = reverse('register_patient')
        data = {
            "email": "patient@example.com",
            "password": "strongpassword123",
            "confirm_password": "strongpassword123",
            "full_name": "Test Patient"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] == True

        # Verify user is created but not verified
        user = User.objects.get(email="patient@example.com")
        assert not user.is_verified
        assert user.role == "patient"

    def test_doctor_registration(self, api_client):
        url = reverse('register_doctor')
        data = {
            "email": "doctor@example.com",
            "password": "strongpassword123",
            "full_name": "Test Doctor",
            "specialization": "Cardiology",
            "bmdc_number": "123456"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] == True

        user = User.objects.get(email="doctor@example.com")
        assert not user.is_verified
        assert user.role == "doctor"
        assert hasattr(user, 'doctor_profile')
        assert user.doctor_profile.specialization == "Cardiology"

    def test_login_unverified_fails(self, api_client):
        # Create user
        User.objects.create_user(email="test@test.com", password="password123", full_name="Test", role="patient")
        
        url = reverse('login')
        data = {
            "email": "test@test.com",
            "password": "password123"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['success'] == False
        assert "not verified" in response.data['message']

    def test_login_verified_success(self, api_client):
        # Create and verify user
        user = User.objects.create_user(email="test@test.com", password="password123", full_name="Test", role="patient")
        user.is_verified = True
        user.save()

        url = reverse('login')
        data = {
            "email": "test@test.com",
            "password": "password123"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] == True
        assert 'access' in response.data['data']['tokens']
