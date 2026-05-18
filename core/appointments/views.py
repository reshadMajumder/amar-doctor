from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime

from appointments.models import DoctorAvailability, DoctorBlockedSlot, Appointment
from appointments.serializers import (
    DoctorAvailabilitySerializer, 
    DoctorBlockedSlotSerializer, 
    AppointmentSerializer,
    SlotSerializer
)
from appointments.services.slot_generation_service import SlotGenerationService
from appointments.services.booking_service import BookingService
from appointments.services.appointment_service import AppointmentService
from accounts.models import User

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DoctorAvailabilitySerializer

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

class AvailableSlotsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SlotSerializer

    def get_queryset(self):
        doctor_id = self.kwargs.get('doctor_id')
        date_str = self.request.query_params.get('date')
        
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                date_obj = timezone.now().date()
        else:
            date_obj = timezone.now().date()

        doctor = get_object_or_404(User, id=doctor_id, role='doctor')
        return SlotGenerationService.generate_slots(doctor, date_obj)

class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)

    def create(self, request, *args, **kwargs):
        # We override create to use BookingService
        doctor_id = request.data.get('doctor')
        slot_start_str = request.data.get('scheduled_start')
        consultation_type = request.data.get('consultation_type', 'text')
        ai_report_id = request.data.get('ai_report')
        notes = request.data.get('notes')

        if not all([doctor_id, slot_start_str]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        doctor = get_object_or_404(User, id=doctor_id, role='doctor')
        slot_start = timezone.datetime.fromisoformat(slot_start_str.replace('Z', '+00:00'))

        try:
            appointment = BookingService.create_appointment(
                patient=request.user,
                doctor=doctor,
                slot_start=slot_start,
                consultation_type=consultation_type,
                ai_report=ai_report_id,
                notes=notes
            )
            serializer = self.get_serializer(appointment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        appointment = self.get_object()
        if request.user != appointment.doctor:
            return Response({"error": "Only assigned doctor can approve"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            AppointmentService.update_status(appointment, 'doctor_approved', request.user)
            return Response(self.get_serializer(appointment).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        appointment = self.get_object()
        if request.user != appointment.doctor:
            return Response({"error": "Only assigned doctor can reject"}, status=status.HTTP_403_FORBIDDEN)
        
        reason = request.data.get('reason', 'Rejected by doctor')
        try:
            AppointmentService.update_status(appointment, 'rejected', request.user, reason=reason)
            return Response(self.get_serializer(appointment).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        reason = request.data.get('reason', 'Cancelled by user')
        
        try:
            AppointmentService.cancel_appointment(appointment, request.user, reason)
            return Response(self.get_serializer(appointment).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def start_session(self, request, pk=None):
        appointment = self.get_object()
        if request.user != appointment.doctor and request.user != appointment.patient:
            return Response({"error": "Only assigned doctor or patient can start the session"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            if appointment.status == 'doctor_approved':
                AppointmentService.update_status(appointment, 'confirmed', request.user)
            
            from chat.models import ChatRoom
            from chat.services.room_service import RoomService
            
            room, created = ChatRoom.objects.get_or_create(
                appointment=appointment,
                defaults={
                    'patient': appointment.patient,
                    'doctor': appointment.doctor,
                    'status': ChatRoom.STATUS_WAITING
                }
            )
            
            RoomService.start_consultation(room)
            
            serializer = self.get_serializer(appointment)
            return Response({
                "message": "Session started successfully",
                "room_id": room.id,
                "appointment": serializer.data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def complete_session(self, request, pk=None):
        appointment = self.get_object()
        if request.user != appointment.doctor:
            return Response({"error": "Only the assigned doctor can complete the session"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            from chat.models import ChatRoom
            from chat.services.room_service import RoomService
            
            room = get_object_or_404(ChatRoom, appointment=appointment)
            RoomService.end_consultation(room)
            
            serializer = self.get_serializer(appointment)
            return Response({
                "message": "Session completed successfully",
                "room_id": room.id,
                "appointment": serializer.data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Add other actions (reject, start, complete) similarly
