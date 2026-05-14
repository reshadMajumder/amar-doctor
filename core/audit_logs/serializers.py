from rest_framework import serializers
from audit_logs.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'actor',
            'actor_email',
            'action_type',
            'action_type_display',
            'target_model',
            'target_id',
            'previous_data',
            'new_data',
            'ip_address',
            'user_agent',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else 'system'
