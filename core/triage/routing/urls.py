from django.urls import re_path
from triage.consumers.triage_consumer import TriageConsumer

websocket_urlpatterns = [
    re_path(r'ws/triage/(?P<session_id>\w+)/$', TriageConsumer.as_asgi()),
]
