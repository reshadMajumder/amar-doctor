from rest_framework import serializers


class DashboardSerializer(serializers.Serializer):
    """Read-only wrapper for dashboard data dict."""
    users = serializers.DictField()
    financial = serializers.DictField()
    appointments = serializers.DictField()
    ai_metrics = serializers.DictField()
    system_health = serializers.DictField()
    generated_at = serializers.CharField()
