import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import AdminProfile

User = get_user_model()

@pytest.fixture
def finance_admin(db):
    user = User.objects.create_user(email='finance@admin.com', password='password', full_name='Finance Admin', role='admin')
    AdminProfile.objects.create(user=user, admin_role='finance_admin')
    return user

@pytest.fixture
def support_admin(db):
    user = User.objects.create_user(email='support@admin.com', password='password', full_name='Support Admin', role='admin')
    AdminProfile.objects.create(user=user, admin_role='support_admin')
    return user

@pytest.mark.django_db
class TestAdminPermissions:
    def test_finance_admin_can_access_financials(self, api_client, finance_admin):
        api_client.force_authenticate(user=finance_admin)
        url = reverse('admin-financial-overview')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_support_admin_cannot_access_financials(self, api_client, support_admin):
        api_client.force_authenticate(user=support_admin)
        url = reverse('admin-financial-overview')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_any_admin_can_access_dashboard(self, api_client, support_admin):
        api_client.force_authenticate(user=support_admin)
        url = reverse('admin-dashboard')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
