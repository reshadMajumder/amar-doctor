import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import DoctorProfile, AdminProfile

User = get_user_model()

@pytest.fixture
def super_admin(db):
    user = User.objects.create_superuser(email='super@admin.com', password='password', full_name='Super Admin')
    AdminProfile.objects.create(user=user, admin_role='super_admin')
    return user

@pytest.fixture
def verification_admin(db):
    user = User.objects.create_user(email='verify@admin.com', password='password', full_name='Verify Admin', role='admin')
    AdminProfile.objects.create(user=user, admin_role='doctor_verification_admin')
    return user

@pytest.fixture
def doctor_pending(db):
    user = User.objects.create_user(email='doctor@test.com', password='password', full_name='Test Doctor', role='doctor')
    profile = DoctorProfile.objects.create(user=user, specialization='General', bmdc_number='A-12345')
    return profile

@pytest.mark.django_db
class TestDoctorVerification:
    def test_approve_doctor_success(self, api_client, verification_admin, doctor_pending):
        api_client.force_authenticate(user=verification_admin)
        url = reverse('admin-doctor-approve', kwargs={'pk': doctor_pending.id})
        response = api_client.patch(url, {'notes': 'All good'})
        
        assert response.status_code == status.HTTP_200_OK
        doctor_pending.refresh_from_db()
        assert doctor_pending.verification_status == 'approved'
        assert doctor_pending.user.is_verified is True
        assert doctor_pending.is_available is True

    def test_reject_doctor_success(self, api_client, verification_admin, doctor_pending):
        api_client.force_authenticate(user=verification_admin)
        url = reverse('admin-doctor-reject', kwargs={'pk': doctor_pending.id})
        response = api_client.patch(url, {'notes': 'Invalid BMDC'})
        
        assert response.status_code == status.HTTP_200_OK
        doctor_pending.refresh_from_db()
        assert doctor_pending.verification_status == 'rejected'
        assert doctor_pending.user.is_verified is False

    def test_unauthorized_access(self, api_client, doctor_pending):
        # No authentication
        url = reverse('admin-doctor-approve', kwargs={'pk': doctor_pending.id})
        response = api_client.patch(url, {'notes': 'hack'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_role_restriction(self, api_client, doctor_pending):
        # Patient trying to approve
        patient = User.objects.create_user(email='patient@test.com', password='password', full_name='Patient')
        api_client.force_authenticate(user=patient)
        url = reverse('admin-doctor-approve', kwargs={'pk': doctor_pending.id})
        response = api_client.patch(url, {'notes': 'hack'})
        assert response.status_code == status.HTTP_403_FORBIDDEN
