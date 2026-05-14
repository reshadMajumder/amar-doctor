from django.urls import path
from admin_panel.views import (
    PendingDoctorsListView, AllDoctorsListView, DoctorDetailView,
    ApproveDoctorView, RejectDoctorView, SuspendDoctorView,
    AdminDashboardView, SystemHealthView,
    FinancialOverviewView, TransactionListView, DoctorPayoutsView,
    UserListView, SuspendUserView, UnsuspendUserView,
    DeactivateUserView, FlagUserView,
    DisputeListCreateView, DisputeDetailView,
)

urlpatterns = [
    # Dashboard & Health
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('system-health/', SystemHealthView.as_view(), name='admin-system-health'),

    # Doctor Verification
    path('doctors/', AllDoctorsListView.as_view(), name='admin-doctor-list'),
    path('doctors/pending/', PendingDoctorsListView.as_view(), name='admin-doctor-pending'),
    path('doctors/<int:pk>/', DoctorDetailView.as_view(), name='admin-doctor-detail'),
    path('doctors/<int:pk>/approve/', ApproveDoctorView.as_view(), name='admin-doctor-approve'),
    path('doctors/<int:pk>/reject/', RejectDoctorView.as_view(), name='admin-doctor-reject'),
    path('doctors/<int:pk>/suspend/', SuspendDoctorView.as_view(), name='admin-doctor-suspend'),

    # User Moderation
    path('users/', UserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/suspend/', SuspendUserView.as_view(), name='admin-user-suspend'),
    path('users/<int:pk>/unsuspend/', UnsuspendUserView.as_view(), name='admin-user-unsuspend'),
    path('users/<int:pk>/deactivate/', DeactivateUserView.as_view(), name='admin-user-deactivate'),
    path('users/<int:pk>/flag/', FlagUserView.as_view(), name='admin-user-flag'),

    # Financial
    path('financial/overview/', FinancialOverviewView.as_view(), name='admin-financial-overview'),
    path('transactions/', TransactionListView.as_view(), name='admin-transaction-list'),
    path('payouts/', DoctorPayoutsView.as_view(), name='admin-payout-list'),

    # Disputes
    path('disputes/', DisputeListCreateView.as_view(), name='admin-dispute-list'),
    path('disputes/<int:pk>/', DisputeDetailView.as_view(), name='admin-dispute-detail'),
]
