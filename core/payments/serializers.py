from rest_framework import serializers
from .models import PaymentTransaction
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer

class CreatePaymentSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = PaymentTransaction
        fields = ['id', 'appointment_id', 'amount', 'status', 'transaction_id', 'created_at']
        read_only_fields = ['id', 'amount', 'status', 'transaction_id', 'created_at']

    def validate_appointment_id(self, value):
        user = self.context['request'].user
        try:
            appointment = Appointment.objects.get(id=value, patient=user)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError("Appointment not found or not owned by you.")
        
        if appointment.payment_status == 'paid_held' or appointment.payment_status == 'released':
            raise serializers.ValidationError("Appointment is already paid.")
        
        if appointment.status in ['cancelled', 'rejected', 'missed']:
            raise serializers.ValidationError(f"Cannot pay for an appointment with status: {appointment.status}")
            
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        appointment = Appointment.objects.get(id=validated_data['appointment_id'], patient=user)
        
        # Create payment record
        payment = PaymentTransaction.objects.create(
            user=user, 
            appointment=appointment, 
            amount=appointment.consultation_fee, 
            status=PaymentTransaction.STATUS_INITIATED
        )
        return payment

class PaymentDetailSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(allow_null=True, read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = ['id', 'appointment', 'amount', 'status', 'transaction_id', 'created_at']
