from rest_framework import serializers
from .models import Prescription, PrescriptionItem
from appointments.serializers import AppointmentSerializer

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medicine_name', 'generic_name', 'dosage', 'frequency', 'duration', 'instruction', 'quantity']

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)
    appointment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment_id', 'patient', 'doctor', 
            'diagnosis_notes', 'advice_notes', 'follow_up_instructions', 
            'status', 'items', 'issued_at', 'finalized_at', 'created_at'
        ]
        read_only_fields = ['patient', 'doctor', 'status', 'issued_at', 'finalized_at', 'created_at']

class PrescriptionDetailSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)
    appointment = AppointmentSerializer(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'patient', 'doctor', 
            'diagnosis_notes', 'advice_notes', 'follow_up_instructions', 
            'status', 'items', 'issued_at', 'finalized_at', 'created_at'
        ]
