from django.urls import re_path
from appointments.consumers.appointment_consumer import AppointmentConsumer

websocket_urlpatterns = [
    re_path(r'ws/appointments/$', AppointmentConsumer.as_asgi()),
]
