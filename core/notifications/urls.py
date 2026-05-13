from django.urls import path
from .views import (
    NotificationListView, 
    NotificationReadView, 
    NotificationReadAllView, 
    NotificationPreferenceView
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
]
