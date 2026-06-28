from rest_framework import serializers
from appointments.models import DoctorAvailability, DoctorBlockedSlot, Appointment, AppointmentStatusLog
from accounts.serializers import UserSerializer # Assuming this exists or using a simple one
from triage.serializers import AIReportSerializer

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
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    doctor_email = serializers.CharField(source='doctor.email', read_only=True)
    chat_room_id = serializers.IntegerField(source='chat_room.id', read_only=True, allow_null=True)
    ai_report_details = AIReportSerializer(source='ai_report', read_only=True, allow_null=True)
    has_prescription = serializers.SerializerMethodField()
    prescription_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('booking_reference', 'status', 'payment_status', 'patient', 'scheduled_end')

    def get_has_prescription(self, obj):
        return hasattr(obj, 'prescription')

    def get_prescription_id(self, obj):
        if hasattr(obj, 'prescription'):
            return obj.prescription.id
        return None

    def validate_no_prescription_required(self, value):
        request = self.context.get('request')
        if request and request.user.role != 'doctor':
            raise serializers.ValidationError("Only doctors can modify 'no_prescription_required'.")
        return value

class AppointmentStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentStatusLog
        fields = '__all__'

class SlotSerializer(serializers.Serializer):
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    timezone = serializers.CharField()
