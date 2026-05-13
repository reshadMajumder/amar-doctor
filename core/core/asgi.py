import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from triage.middleware.jwt_auth import JWTAuthMiddlewareStack
import triage.routing.urls
import appointments.routing.appointment_routing
import chat.routing.urls
import notifications.routing.urls

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            triage.routing.urls.websocket_urlpatterns + 
            appointments.routing.appointment_routing.websocket_urlpatterns +
            chat.routing.urls.websocket_urlpatterns +
            notifications.routing.urls.websocket_urlpatterns
        )
    ),
})
