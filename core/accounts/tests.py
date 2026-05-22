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


@pytest.mark.django_db
class TestEmailService:
    @pytest.fixture(autouse=True)
    def setup_patches(self):
        from unittest.mock import patch
        self.patcher = patch('resend.Emails.send')
        self.mock_resend_send = self.patcher.start()
        yield
        self.patcher.stop()

    def test_email_service_provider_selection_resend(self, settings):
        from accounts.services.email_service import EmailService, ResendEmailProvider
        settings.EMAIL_PROVIDER = 'resend'
        settings.RESEND_API_KEY = 'fake_key'
        service = EmailService()
        assert isinstance(service.provider, ResendEmailProvider)
        assert service.provider.api_key == 'fake_key'

    def test_email_service_provider_selection_smtp(self, settings):
        from accounts.services.email_service import EmailService, SMTPEmailProvider
        settings.EMAIL_PROVIDER = 'smtp'
        service = EmailService()
        assert isinstance(service.provider, SMTPEmailProvider)

    def test_email_service_provider_selection_default(self, settings):
        from accounts.services.email_service import EmailService, SMTPEmailProvider
        if hasattr(settings, 'EMAIL_PROVIDER'):
            del settings.EMAIL_PROVIDER
        service = EmailService()
        assert isinstance(service.provider, SMTPEmailProvider)

    def test_resend_provider_send(self, settings):
        from accounts.services.email_service import EmailService
        settings.EMAIL_PROVIDER = 'resend'
        settings.RESEND_API_KEY = 'fake_key'
        settings.DEFAULT_FROM_EMAIL = 'noreply@test.com'
        
        service = EmailService()
        result = service.send_registration_otp('test@example.com', '123456')
        
        assert result is True
        self.mock_resend_send.assert_called_once()
        call_args = self.mock_resend_send.call_args[0][0]
        assert call_args['from'] == 'noreply@test.com'
        assert call_args['to'] == 'test@example.com'
        assert '123456' in call_args['html']


@pytest.mark.django_db
class TestDoctorListView:
    @pytest.fixture(autouse=True)
    def setup_locmem_cache(self, settings):
        settings.CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            }
        }
        cache.clear()

    def test_doctor_list_excludes_suspended_and_inactive(self, api_client):
        # 1. Approved & Active & Available
        user1 = User.objects.create_user(
            email='active_doc@test.com', password='password123', full_name='Dr. Active', role='doctor'
        )
        DoctorProfile.objects.create(
            user=user1, specialization='Cardiology', bmdc_number='111', verification_status='approved', is_available=True
        )

        # 2. Suspended
        user2 = User.objects.create_user(
            email='suspended_doc@test.com', password='password123', full_name='Dr. Suspended', role='doctor', is_suspended=True
        )
        DoctorProfile.objects.create(
            user=user2, specialization='Cardiology', bmdc_number='222', verification_status='approved', is_available=True
        )

        # 3. Inactive
        user3 = User.objects.create_user(
            email='inactive_doc@test.com', password='password123', full_name='Dr. Inactive', role='doctor', is_active=False
        )
        DoctorProfile.objects.create(
            user=user3, specialization='Cardiology', bmdc_number='333', verification_status='approved', is_available=True
        )

        url = reverse('doctor_list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data['data']
        
        # Only active_doc should be listed
        assert len(data) == 1
        assert data[0]['user']['email'] == 'active_doc@test.com'

    def test_doctor_list_caching_30s_ttl(self, api_client):
        # Create approved doctor
        user = User.objects.create_user(
            email='cache_doc@test.com', password='password123', full_name='Dr. Cache', role='doctor'
        )
        DoctorProfile.objects.create(
            user=user, specialization='Cardiology', bmdc_number='444', verification_status='approved', is_available=True
        )

        url = reverse('doctor_list')
        
        # First request should populate cache
        response1 = api_client.get(url)
        assert response1.status_code == status.HTTP_200_OK
        
        # Modify database directly without triggering signal (using update)
        DoctorProfile.objects.filter(user=user).update(specialization='Neurology')
        
        # Second request should still return cached data (Cardiology)
        response2 = api_client.get(url)
        assert response2.data['data'][0]['specialization'] == 'Cardiology'

        # Clear cache manually to verify database update
        cache.clear()
        response3 = api_client.get(url)
        assert response3.data['data'][0]['specialization'] == 'Neurology'

    def test_doctor_list_specific_id_fallback(self, api_client):
        # Create a pending doctor (not approved)
        user = User.objects.create_user(
            email='pending_doc@test.com', password='password123', full_name='Dr. Pending', role='doctor'
        )
        DoctorProfile.objects.create(
            user=user, specialization='Cardiology', bmdc_number='555', verification_status='pending', is_available=True
        )

        url = reverse('doctor_list')
        
        # Querying specific doctor_id should fallback to pending doctor
        response = api_client.get(f"{url}?doctor_id={user.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == 1
        assert response.data['data'][0]['user']['email'] == 'pending_doc@test.com'


