from rest_framework import serializers
from appointments.models import DoctorAvailability, DoctorBlockedSlot, Appointment, AppointmentStatusLog
from accounts.serializers import UserSerializer # Assuming this exists or using a simple one

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'
        read_only_fields = ('doctor',)

    def validate(self, data):
        # Add custom validation logic here if needed (e.g. overlapping periods)
        return data

class DoctorBlockedSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorBlockedSlot
        fields = '__all__'
        read_only_fields = ('doctor',)

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('booking_reference', 'status', 'payment_status', 'patient', 'scheduled_end')

class AppointmentStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentStatusLog
        fields = '__all__'

class SlotSerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    timezone = serializers.CharField()
