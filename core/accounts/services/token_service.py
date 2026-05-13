from rest_framework_simplejwt.tokens import RefreshToken

class TokenService:
    @staticmethod
    def get_tokens_for_user(user):
        refresh = RefreshToken.for_user(user)

        # Add custom claims if needed
        refresh['email'] = user.email
        refresh['role'] = user.role

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
