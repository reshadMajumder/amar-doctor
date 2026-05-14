from rest_framework import serializers
from payments.models import PaymentTransaction
from wallets.models import WalletTransaction


class PaymentTransactionAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    appointment_reference = serializers.CharField(
        source='appointment.booking_reference', read_only=True
    )

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'user', 'user_email', 'appointment', 'appointment_reference',
            'amount', 'status', 'gateway_provider', 'transaction_id',
            'val_id', 'metadata', 'held_at', 'released_at', 'refunded_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WalletTransactionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'wallet_type', 'transaction_type', 'direction',
            'amount', 'previous_balance', 'new_balance',
            'reference', 'status', 'metadata', 'created_at',
        ]
        read_only_fields = fields
