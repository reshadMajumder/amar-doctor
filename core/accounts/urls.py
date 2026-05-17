from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import (
    PatientRegistrationView, DoctorRegistrationView, VerifyRegistrationOTPView,
    LoginView, RequestLoginOTPView, VerifyLoginOTPView,
    PasswordResetRequestView, PasswordResetVerifyView, PasswordResetConfirmView,
    LogoutView, ProfileView, DoctorListView
)

urlpatterns = [
    path('register/patient/', PatientRegistrationView.as_view(), name='register_patient'),
    path('register/doctor/', DoctorRegistrationView.as_view(), name='register_doctor'),
    path('verify-otp/', VerifyRegistrationOTPView.as_view(), name='verify_registration_otp'),
    
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('request-login-otp/', RequestLoginOTPView.as_view(), name='request_login_otp'),
    path('verify-login-otp/', VerifyLoginOTPView.as_view(), name='verify_login_otp'),
    
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('profile/', ProfileView.as_view(), name='user_profile'),
    path('doctors/', DoctorListView.as_view(), name='doctor_list'),
]
