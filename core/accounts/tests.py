import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.cache import cache
from accounts.models import DoctorProfile, AdminProfile

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

@pytest.mark.django_db
class TestAccountsAdminFeatures:
    @pytest.fixture(autouse=True)
    def setup_locmem_cache(self, settings):
        settings.CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            }
        }

    def test_user_suspension_logic(self, db):
        user = User.objects.create_user(
            email='suspended@test.com',
            password='password123',
            full_name='Suspended User'
        )
        assert user.is_suspended is False
        
        user.is_suspended = True
        user.suspension_reason = 'Violation of terms'
        user.save()
        
        reloaded_user = User.objects.get(email='suspended@test.com')
        assert reloaded_user.is_suspended is True
        assert reloaded_user.suspension_reason == 'Violation of terms'

    def test_doctor_profile_verification_fields(self, db):
        user = User.objects.create_user(
            email='doctor_verify@test.com',
            password='password123',
            full_name='Dr. Verify',
            role='doctor'
        )
        profile = DoctorProfile.objects.create(
            user=user,
            specialization='General',
            bmdc_number='A-12345'
        )
        
        assert profile.verification_status == 'pending'
        assert profile.is_available is False
        assert profile.verified_by is None
        assert profile.verified_at is None

    def test_admin_profile_creation(self, db):
        admin_user = User.objects.create_superuser(
            email='ops@admin.com',
            password='password123',
            full_name='Ops Admin'
        )
        admin_user.role = 'admin'
        admin_user.save()
        
        profile = AdminProfile.objects.create(
            user=admin_user,
            admin_role='operations_admin'
        )
        
        assert admin_user.admin_profile.admin_role == 'operations_admin'
        assert profile.user == admin_user

    def test_suspended_user_login_fails(self, api_client):
        user = User.objects.create_user(
            email='suspended_login@test.com',
            password='password123',
            full_name='Suspended',
            is_verified=True
        )
        user.is_suspended = True
        user.save()

        url = reverse('login')
        data = {
            'email': 'suspended_login@test.com',
            'password': 'password123'
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'suspended' in response.data.get('message', '').lower()

    def test_doctor_consultation_eligibility(self, db):
        user = User.objects.create_user(
            email='eligible@test.com',
            password='password123',
            full_name='Dr. Eligible',
            role='doctor',
            is_verified=True
        )
        profile = DoctorProfile.objects.create(
            user=user,
            specialization='General',
            bmdc_number='A-12345'
        )
        
        # Initially false because verification_status is pending
        assert profile.can_consult is False
        
        # Set to approved but not available
        profile.verification_status = 'approved'
        profile.save()
        assert profile.can_consult is False
        
        # Set to available
        profile.is_available = True
        profile.save()
        assert profile.can_consult is True
        
        # Suspend the user
        user.is_suspended = True
        user.save()
        assert profile.can_consult is False


@pytest.mark.django_db
class TestUserProfileAPI:
    @pytest.fixture(autouse=True)
    def setup_locmem_cache(self, settings):
        settings.CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            }
        }

    def test_get_patient_profile(self, api_client):
        user = User.objects.create_user(
            email='patient_profile@test.com',
            password='password123',
            full_name='Patient Profile',
            role='patient',
            is_verified=True
        )
        api_client.force_authenticate(user=user)
        
        url = reverse('user_profile')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['email'] == 'patient_profile@test.com'
        assert response.data['data']['full_name'] == 'Patient Profile'
        assert 'specialization' not in response.data['data']

    def test_get_doctor_profile(self, api_client):
        user = User.objects.create_user(
            email='doctor_profile@test.com',
            password='password123',
            full_name='Dr. Profile',
            role='doctor',
            is_verified=True
        )
        DoctorProfile.objects.create(
            user=user,
            specialization='Pediatrics',
            bmdc_number='A-54321',
            consultation_fee=600.00,
            is_available=True
        )
        api_client.force_authenticate(user=user)
        
        url = reverse('user_profile')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['user']['email'] == 'doctor_profile@test.com'
        assert response.data['data']['specialization'] == 'Pediatrics'
        assert float(response.data['data']['consultation_fee']) == 600.00
        assert response.data['data']['is_available'] is True

    def test_update_profile_patient(self, api_client):
        user = User.objects.create_user(
            email='patient_update@test.com',
            password='password123',
            full_name='Old Name',
            role='patient',
            is_verified=True
        )
        api_client.force_authenticate(user=user)
        
        url = reverse('user_profile')
        data = {'full_name': 'New Name'}
        response = api_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['full_name'] == 'New Name'
        
        user.refresh_from_db()
        assert user.full_name == 'New Name'

    def test_update_profile_doctor(self, api_client):
        user = User.objects.create_user(
            email='doctor_update@test.com',
            password='password123',
            full_name='Dr. Old',
            role='doctor',
            is_verified=True
        )
        profile = DoctorProfile.objects.create(
            user=user,
            specialization='Orthopedics',
            bmdc_number='A-99999',
            consultation_fee=500.00,
            is_available=False
        )
        api_client.force_authenticate(user=user)
        
        url = reverse('user_profile')
        data = {
            'full_name': 'Dr. New Name',
            'specialization': 'Sports Medicine',
            'consultation_fee': 800.00,
            'is_available': True
        }
        response = api_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['specialization'] == 'Sports Medicine'
        assert float(response.data['data']['consultation_fee']) == 800.00
        assert response.data['data']['is_available'] is True
        
        user.refresh_from_db()
        profile.refresh_from_db()
        assert user.full_name == 'Dr. New Name'
        assert profile.specialization == 'Sports Medicine'
        assert float(profile.consultation_fee) == 800.00
        assert profile.is_available is True
