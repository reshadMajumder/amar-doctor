from rest_framework import serializers
from triage.models import AITriageSession, AITriageMessage, AIReport

class AITriageMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITriageMessage
        fields = ['id', 'sender_type', 'message_type', 'content', 'metadata', 'created_at']

class AITriageSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITriageSession
        fields = ['id', 'status', 'language', 'current_step', 'risk_level', 'emergency_detected', 'ai_provider', 'started_at', 'completed_at']

class AITriageSessionDetailSerializer(AITriageSessionSerializer):
    messages = AITriageMessageSerializer(many=True, read_only=True)
    
    class Meta(AITriageSessionSerializer.Meta):
        fields = AITriageSessionSerializer.Meta.fields + ['messages']

class AIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIReport
        fields = '__all__'
