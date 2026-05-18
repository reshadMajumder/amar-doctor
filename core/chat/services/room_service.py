from django.utils import timezone
from django.db import transaction
from ..models import ChatRoom, ChatParticipantState
from appointments.models import Appointment

class RoomService:
    @staticmethod
    @transaction.atomic
    def create_room_for_appointment(appointment):
        """
        Creates a chat room when an appointment is confirmed.
        Called via signals or service layer.
        """
        room, created = ChatRoom.objects.get_or_create(
            appointment=appointment,
            defaults={
                'patient': appointment.patient,
                'doctor': appointment.doctor,
                'status': ChatRoom.STATUS_WAITING
            }
        )
        
        # Initialize participant states
        ChatParticipantState.objects.get_or_create(room=room, user=appointment.patient)
        ChatParticipantState.objects.get_or_create(room=room, user=appointment.doctor)
        
        return room

    @staticmethod
    @transaction.atomic
    def start_consultation(room):
        """
        Marks room as active and updates appointment status.
        """
        if room.status != ChatRoom.STATUS_WAITING:
            return room
            
        room.status = ChatRoom.STATUS_ACTIVE
        room.started_at = timezone.now()
        room.save()
        
        # Update appointment status via AppointmentService
        from appointments.services.appointment_service import AppointmentService
        AppointmentService.update_status(room.appointment, 'in_progress', room.doctor)
        
        return room

    @staticmethod
    @transaction.atomic
    def end_consultation(room):
        """
        Ends the consultation.
        """
        if room.status == ChatRoom.STATUS_ENDED:
            return room
            
        room.status = ChatRoom.STATUS_ENDED
        room.ended_at = timezone.now()
        room.save()
        
        # Update appointment status via AppointmentService
        from appointments.services.appointment_service import AppointmentService
        AppointmentService.update_status(room.appointment, 'completed', room.doctor)
        
        return room
