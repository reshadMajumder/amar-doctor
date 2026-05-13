from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import (
    PatientRegistrationSerializer, DoctorRegistrationSerializer,
    LoginSerializer, OTPVerifySerializer, EmailRequestSerializer,
    PasswordResetConfirmSerializer
)
from accounts.services.auth_service import AuthService
from accounts.utils.responses import success_response, error_response

auth_service = AuthService()

class PatientRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PatientRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            success, message = auth_service.register_patient(
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password'],
                full_name=serializer.validated_data['full_name']
            )
            if success:
                return Response(success_response(message=message), status=status.HTTP_201_CREATED)
            return Response(error_response(message=message), status=status.HTTP_400_BAD_REQUEST)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class DoctorRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DoctorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            success, message = auth_service.register_doctor(
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password'],
                full_name=serializer.validated_data['full_name'],
                specialization=serializer.validated_data['specialization'],
                bmdc_number=serializer.validated_data['bmdc_number']
            )
            if success:
                return Response(success_response(message=message), status=status.HTTP_201_CREATED)
            return Response(error_response(message=message), status=status.HTTP_400_BAD_REQUEST)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class VerifyRegistrationOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            success, result = auth_service.verify_registration_otp(
                email=serializer.validated_data['email'],
                otp=serializer.validated_data['otp']
            )
            if success:
                return Response(success_response(message="OTP verified successfully", data=result), status=status.HTTP_200_OK)
            return Response(error_response(message=result), status=status.HTTP_400_BAD_REQUEST)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            success, result = auth_service.login_with_password(
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password']
            )
            if success:
                return Response(success_response(message="Login successful", data=result), status=status.HTTP_200_OK)
            return Response(error_response(message=result), status=status.HTTP_401_UNAUTHORIZED)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class RequestLoginOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        if serializer.is_valid():
            success, message = auth_service.request_login_otp(email=serializer.validated_data['email'])
            return Response(success_response(message=message), status=status.HTTP_200_OK)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class VerifyLoginOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            success, result = auth_service.verify_login_otp(
                email=serializer.validated_data['email'],
                otp=serializer.validated_data['otp']
            )
            if success:
                return Response(success_response(message="Login successful", data=result), status=status.HTTP_200_OK)
            return Response(error_response(message=result), status=status.HTTP_401_UNAUTHORIZED)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailRequestSerializer(data=request.data)
        if serializer.is_valid():
            success, message = auth_service.request_password_reset(email=serializer.validated_data['email'])
            return Response(success_response(message=message), status=status.HTTP_200_OK)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            success, result = auth_service.verify_password_reset_otp(
                email=serializer.validated_data['email'],
                otp=serializer.validated_data['otp']
            )
            if success:
                return Response(success_response(message="OTP verified", data=result), status=status.HTTP_200_OK)
            return Response(error_response(message=result), status=status.HTTP_400_BAD_REQUEST)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            success, message = auth_service.confirm_password_reset(
                email=serializer.validated_data['email'],
                reset_token=serializer.validated_data['reset_token'],
                new_password=serializer.validated_data['new_password']
            )
            if success:
                return Response(success_response(message=message), status=status.HTTP_200_OK)
            return Response(error_response(message=message), status=status.HTTP_400_BAD_REQUEST)
        return Response(error_response(message="Validation Error", errors=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(error_response(message="Refresh token is required"), status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(success_response(message="Successfully logged out."), status=status.HTTP_200_OK)
        except Exception as e:
            return Response(error_response(message="Invalid token or already logged out."), status=status.HTTP_400_BAD_REQUEST)
