import random
from django.core.cache import cache
from django.contrib.auth.hashers import make_password, check_password

class OTPService:
    TTL_SECONDS = 300 # 5 minutes

    def _get_cache_key(self, email, purpose):
        return f"otp:{purpose}:{email}"

    def _get_attempts_key(self, email, purpose):
        return f"otp_attempts:{purpose}:{email}"

    def generate_otp(self):
        return str(random.randint(100000, 999999))

    def store_otp(self, email, otp, purpose):
        cache_key = self._get_cache_key(email, purpose)
        hashed_otp = make_password(otp)
        cache.set(cache_key, hashed_otp, timeout=self.TTL_SECONDS)
        
        # Reset attempts counter on new OTP
        attempts_key = self._get_attempts_key(email, purpose)
        cache.set(attempts_key, 0, timeout=self.TTL_SECONDS)

    def verify_otp(self, email, otp, purpose):
        cache_key = self._get_cache_key(email, purpose)
        attempts_key = self._get_attempts_key(email, purpose)

        hashed_otp = cache.get(cache_key)
        if not hashed_otp:
            return False, "OTP has expired or does not exist."

        attempts = cache.get(attempts_key, 0)
        if attempts >= 3:
            return False, "Maximum verification attempts reached. Please request a new OTP."

        if check_password(otp, hashed_otp):
            # Clean up after successful verification
            cache.delete(cache_key)
            cache.delete(attempts_key)
            return True, "OTP verified successfully."
        else:
            cache.incr(attempts_key)
            return False, "Invalid OTP."
