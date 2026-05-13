from django.urls import path
from .views import ChatRoomListView, ChatRoomDetailView, ChatMessageListView

urlpatterns = [
    path('rooms/', ChatRoomListView.as_view(), name='chat-room-list'),
    path('rooms/<int:pk>/', ChatRoomDetailView.as_view(), name='chat-room-detail'),
    path('rooms/<int:room_id>/messages/', ChatMessageListView.as_view(), name='chat-message-list'),
]
