import urllib.parse
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

User = get_user_model()

@database_sync_to_async
def get_user(token_string):
    try:
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        user = User.objects.get(id=user_id)
        if not user.is_active or not user.is_verified:
            return AnonymousUser()
        return user
    except (TokenError, InvalidToken, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = urllib.parse.parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            scope['user'] = await get_user(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
