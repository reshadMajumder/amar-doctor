from rest_framework import serializers
from .models import PatientWallet, DoctorWallet, WalletTransaction

class WalletSerializer(serializers.Serializer):
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if isinstance(instance, DoctorWallet):
            data['lifetime_earnings'] = instance.lifetime_earnings
            data['wallet_type'] = 'doctor'
        elif isinstance(instance, PatientWallet):
            data['lifetime_spent'] = instance.lifetime_spent
            data['wallet_type'] = 'patient'
        return data

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'
