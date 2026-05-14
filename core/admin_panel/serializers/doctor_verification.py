from rest_framework import serializers
from accounts.models import DoctorProfile, User


class DoctorUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'is_verified',
            'is_active', 'is_suspended', 'created_at'
        ]
        read_only_fields = fields


class DoctorProfileAdminSerializer(serializers.ModelSerializer):
    user = DoctorUserSerializer(read_only=True)
    verified_by_email = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user', 'specialization', 'bmdc_number',
            'documents', 'consultation_fee',
            'verification_status', 'verification_notes',
            'verified_by', 'verified_by_email', 'verified_at',
            'is_available',
        ]
        read_only_fields = fields

    def get_verified_by_email(self, obj):
        return obj.verified_by.email if obj.verified_by else None


class DoctorApprovalSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class DoctorRejectionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=True, max_length=1000)


class DoctorSuspensionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, max_length=1000)
