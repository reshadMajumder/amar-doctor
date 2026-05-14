from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserAdminSerializer(serializers.ModelSerializer):
    suspended_by_email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'is_verified', 'is_active', 'is_suspended',
            'suspension_reason', 'suspended_at',
            'suspended_by', 'suspended_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_suspended_by_email(self, obj):
        return obj.suspended_by.email if obj.suspended_by else None


class UserSuspensionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, max_length=1000)


class UserFlagSerializer(serializers.Serializer):
    notes = serializers.CharField(required=True, max_length=2000)
