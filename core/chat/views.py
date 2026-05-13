from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from .models import ChatRoom, ChatMessage
from .serializers.chat_serializers import ChatRoomSerializer, ChatMessageSerializer

class MessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-created_at'

class ChatRoomListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(Q(patient=user) | Q(doctor=user)).select_related('appointment', 'patient', 'doctor').prefetch_related('participant_states__user')

class ChatRoomDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(Q(patient=user) | Q(doctor=user))

class ChatMessageListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatMessageSerializer
    pagination_class = MessageCursorPagination

    def get_queryset(self):
        user = self.request.user
        room_id = self.kwargs['room_id']
        # Ensure user is part of the room
        try:
            ChatRoom.objects.get(id=room_id, patient=user)
        except ChatRoom.DoesNotExist:
            try:
                ChatRoom.objects.get(id=room_id, doctor=user)
            except ChatRoom.DoesNotExist:
                return ChatMessage.objects.none()
                
        return ChatMessage.objects.filter(room_id=room_id).select_related('sender')
