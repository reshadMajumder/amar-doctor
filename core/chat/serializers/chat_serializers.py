from rest_framework import serializers
from ..models import ChatRoom, ChatMessage, ChatParticipantState
from appointments.serializers import AppointmentSerializer

class ChatParticipantSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    full_name = serializers.CharField(source='user.get_full_name')

    class Meta:
        model = ChatParticipantState
        fields = ['user', 'email', 'full_name', 'is_online', 'last_seen_at', 'typing_status']

class ChatRoomSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    participants = ChatParticipantSerializer(source='participant_states', many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'appointment', 'patient', 'doctor', 'consultation_type', 'status', 'started_at', 'ended_at', 'created_at', 'participants']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'sender_email', 'message_type', 'content', 'metadata', 'is_read', 'read_at', 'created_at']
