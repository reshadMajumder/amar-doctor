from rest_framework import serializers
from admin_panel.models.dispute import ConsultationDispute


class ConsultationDisputeSerializer(serializers.ModelSerializer):
    opened_by_email = serializers.CharField(source='opened_by.email', read_only=True)
    resolved_by_email = serializers.SerializerMethodField()
    appointment_reference = serializers.CharField(
        source='appointment.booking_reference', read_only=True
    )

    class Meta:
        model = ConsultationDispute
        fields = [
            'id', 'appointment', 'appointment_reference',
            'opened_by', 'opened_by_email', 'reason', 'status',
            'resolution_notes', 'resolved_by', 'resolved_by_email',
            'resolved_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'opened_by', 'opened_by_email', 'appointment_reference',
            'resolved_by', 'resolved_by_email', 'resolved_at',
            'created_at', 'updated_at',
        ]

    def get_resolved_by_email(self, obj):
        return obj.resolved_by.email if obj.resolved_by else None


class DisputeCreateSerializer(serializers.Serializer):
    appointment_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=2000)


class DisputeUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ConsultationDispute.STATUS_CHOICES)
    resolution_notes = serializers.CharField(required=False, allow_blank=True)
