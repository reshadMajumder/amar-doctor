from django.contrib.auth import get_user_model
from django.db import transaction
from accounts.models import DoctorProfile
from accounts.services.otp_service import OTPService
from accounts.services.token_service import TokenService
from accounts.tasks.email_tasks import send_registration_otp_task, send_login_otp_task, send_password_reset_otp_task

User = get_user_model()

class AuthService:
    def __init__(self):
        self.otp_service = OTPService()
        self.token_service = TokenService()

    @transaction.atomic
    def register_patient(self, email, password, full_name):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'full_name': full_name, 'role': 'patient'}
        )
        
        if not created and user.is_verified:
            return False, "User with this email already exists and is verified."
            
        user.set_password(password)
        user.full_name = full_name
        user.role = 'patient'
        user.save()

        # Generate and send OTP
        otp = self.otp_service.generate_otp()
        self.otp_service.store_otp(email, otp, purpose='registration')
        send_registration_otp_task.delay(email, otp)
        
        return True, "Registration successful. OTP sent to email."

    @transaction.atomic
    def register_doctor(self, email, password, full_name, specialization, bmdc_number):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'full_name': full_name, 'role': 'doctor'}
        )
        
        if not created and user.is_verified:
            return False, "User with this email already exists."

        user.set_password(password)
        user.full_name = full_name
        user.role = 'doctor'
        user.is_verified = False # Explicitly false, needs admin approval
        user.save()

        # Create or update profile
        DoctorProfile.objects.update_or_create(
            user=user,
            defaults={
                'specialization': specialization,
                'bmdc_number': bmdc_number
            }
        )

        # Generate and send OTP for email verification
        otp = self.otp_service.generate_otp()
        self.otp_service.store_otp(email, otp, purpose='registration')
        send_registration_otp_task.delay(email, otp)
        
        return True, "Registration successful. OTP sent for email verification. Account pending admin approval."

    def verify_registration_otp(self, email, otp):
        success, message = self.otp_service.verify_otp(email, otp, purpose='registration')
        if not success:
            return False, message

        try:
            user = User.objects.get(email=email)
            user.is_verified = True
            user.save()
            tokens = self.token_service.get_tokens_for_user(user)
            return True, {
                'tokens': tokens,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role
                }
            }
        except User.DoesNotExist:
            return False, "User not found."

    def login_with_password(self, email, password):
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return False, "Invalid credentials."

        if not user.check_password(password):
            return False, "Invalid credentials."

        if not user.is_verified:
            return False, "Account is not verified. Please verify your email or wait for admin approval."

        if user.is_suspended:
            return False, f"Your account has been suspended. Reason: {user.suspension_reason or 'No reason provided'}"

        tokens = self.token_service.get_tokens_for_user(user)
        return True, {
            'tokens': tokens,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role
            }
        }

    def request_login_otp(self, email):
        try:
            user = User.objects.get(email=email)
            if not user.is_verified:
                return False, "Account is not verified."
        except User.DoesNotExist:
            # Prevent email enumeration by saying OTP is sent if account exists
            pass

        # Generate and send OTP anyway to prevent enumeration
        otp = self.otp_service.generate_otp()
        self.otp_service.store_otp(email, otp, purpose='login')
        send_login_otp_task.delay(email, otp)
        return True, "If the account exists and is verified, an OTP has been sent."

    def verify_login_otp(self, email, otp):
        success, message = self.otp_service.verify_otp(email, otp, purpose='login')
        if not success:
            return False, message

        try:
            user = User.objects.get(email=email)
            if user.is_suspended:
                return False, f"Your account has been suspended. Reason: {user.suspension_reason or 'No reason provided'}"
            tokens = self.token_service.get_tokens_for_user(user)
            return True, {
                'tokens': tokens,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role
                }
            }
        except User.DoesNotExist:
            return False, "User not found."

    def request_password_reset(self, email):
        try:
            user = User.objects.get(email=email)
            otp = self.otp_service.generate_otp()
            self.otp_service.store_otp(email, otp, purpose='password_reset')
            send_password_reset_otp_task.delay(email, otp)
        except User.DoesNotExist:
            pass # Prevent enumeration

        return True, "If the account exists, a password reset OTP has been sent."

    def verify_password_reset_otp(self, email, otp):
        # Only check validity, don't consume yet
        success, message = self.otp_service.verify_otp(email, otp, purpose='password_reset')
        if not success:
            return False, message
            
        # Re-store a short-lived token to confirm reset
        temp_token = self.otp_service.generate_otp()
        self.otp_service.store_otp(email, temp_token, purpose='password_reset_confirm')
        return True, {"reset_token": temp_token}

    def confirm_password_reset(self, email, reset_token, new_password):
        success, message = self.otp_service.verify_otp(email, reset_token, purpose='password_reset_confirm')
        if not success:
            return False, "Invalid or expired reset token."

        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            return True, "Password reset successful."
        except User.DoesNotExist:
            return False, "User not found."
