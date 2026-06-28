from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import (
    PatientRegistrationSerializer, DoctorRegistrationSerializer,
    LoginSerializer, OTPVerifySerializer, EmailRequestSerializer,
    PasswordResetConfirmSerializer, UserSerializer, DoctorProfileSerializer
)
from accounts.services.auth_service import AuthService
from accounts.utils.responses import success_response, error_response
from accounts.models import DoctorProfile

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


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'doctor':
            try:
                profile = user.doctor_profile
                serializer = DoctorProfileSerializer(profile)
                return Response(success_response(message="Profile retrieved", data=serializer.data), status=status.HTTP_200_OK)
            except DoctorProfile.DoesNotExist:
                pass
        
        serializer = UserSerializer(user)
        return Response(success_response(message="Profile retrieved", data=serializer.data), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        user_serializer = UserSerializer(user, data=request.data, partial=True)
        if user_serializer.is_valid():
            user_serializer.save()
            
            if user.role == 'doctor':
                try:
                    profile = user.doctor_profile
                    profile_serializer = DoctorProfileSerializer(profile, data=request.data, partial=True)
                    if profile_serializer.is_valid():
                        profile_serializer.save()
                        return Response(success_response(message="Profile updated", data=profile_serializer.data), status=status.HTTP_200_OK)
                    return Response(error_response(message="Validation Error", errors=profile_serializer.errors), status=status.HTTP_400_BAD_REQUEST)
                except DoctorProfile.DoesNotExist:
                    pass
            
            return Response(success_response(message="Profile updated", data=user_serializer.data), status=status.HTTP_200_OK)
        return Response(error_response(message="Validation Error", errors=user_serializer.errors), status=status.HTTP_400_BAD_REQUEST)


class DoctorListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q

        specialization = request.query_params.get('specialization')
        search = request.query_params.get('search')
        doctor_id = request.query_params.get('doctor_id')

        queryset = DoctorProfile.objects.filter(
            verification_status='approved',
            user__is_active=True,
            user__is_suspended=False
        )
        
        if doctor_id:
            if not queryset.filter(user_id=doctor_id).exists():
                # Dev/sandbox fallback to display the profile if not approved yet
                queryset = DoctorProfile.objects.filter(
                    user_id=doctor_id,
                    user__is_active=True,
                    user__is_suspended=False
                )
            else:
                queryset = queryset.filter(user_id=doctor_id)
        else:
            if not queryset.exists():
                # Dev/sandbox fallback to display profiles
                queryset = DoctorProfile.objects.filter(
                    user__is_active=True,
                    user__is_suspended=False
                )

        if specialization:
            spec_clean = specialization.lower().strip()
            if spec_clean in ['er', 'emergency', 'emergency room', 'icu', 'ccu']:
                # Map urgent/ER cases to General Physician gates in a virtual setting
                queryset = queryset.filter(specialization__icontains='General Physician')
            elif len(specialization) <= 2:
                queryset = queryset.filter(specialization__iexact=specialization)
            else:
                queryset = queryset.filter(specialization__icontains=specialization)
        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) |
                Q(specialization__icontains=search)
            )

        # Pagination support (triggered only if 'page' or 'page_size' in query parameters)
        if 'page' in request.query_params or 'page_size' in request.query_params:
            from rest_framework.pagination import PageNumberPagination
            paginator = PageNumberPagination()
            paginator.page_size = 4  # default page size matching the frontend layout
            paginator.page_size_query_param = 'page_size'
            paginator.max_page_size = 100
            
            page = paginator.paginate_queryset(queryset, request, view=self)
            if page is not None:
                serializer = DoctorProfileSerializer(page, many=True)
                return Response(success_response(data={
                    'count': paginator.page.paginator.count,
                    'next': paginator.get_next_link(),
                    'previous': paginator.get_previous_link(),
                    'current_page': paginator.page.number,
                    'total_pages': paginator.page.paginator.num_pages,
                    'results': serializer.data
                }), status=status.HTTP_200_OK)

        serializer = DoctorProfileSerializer(queryset, many=True)
        return Response(success_response(data=serializer.data), status=status.HTTP_200_OK)


class SpecializationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = DoctorProfile.objects.filter(verification_status='approved', is_available=True)
        if not queryset.exists():
            queryset = DoctorProfile.objects.all()

        specializations = list(queryset.values_list('specialization', flat=True).distinct())
        
        if "General Physician" not in specializations:
            specializations.append("General Physician")

        return Response(success_response(data=specializations), status=status.HTTP_200_OK)
