from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from datetime import timedelta
from appointments.models import Appointment, DoctorAvailability
from appointments.services.slot_generation_service import SlotGenerationService
from appointments.events.appointment_events import AppointmentEvents

class BookingService:
    @staticmethod
    @transaction.atomic
    def create_appointment(patient, doctor, slot_start, consultation_type, ai_report=None, notes=None):
        """
        Atomically books an appointment.
        Uses select_for_update to prevent concurrent bookings for the same slot.
        """
        # Validate doctor role
        if doctor.role != 'doctor':
            raise ValidationError(_("Selected user is not a doctor."))

        # 1. Check if the slot is still available
        # We fetch the date from slot_start
        date_obj = slot_start.date()
        available_slots = SlotGenerationService.generate_slots(doctor, date_obj)
        
        is_available = any(s['start'] == slot_start for s in available_slots)
        if not is_available:
            raise ValidationError(_("The selected slot is no longer available."))

        # 2. Get slot duration for this doctor
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            weekday=slot_start.weekday(),
            is_active=True
        ).first()
        
        if not availability:
            raise ValidationError(_("Doctor has no availability for this day."))

        slot_end = slot_start + timedelta(minutes=availability.slot_duration_minutes)

        # 3. Lock relevant records to prevent race conditions
        # We lock existing appointments for this doctor that overlap with this slot
        overlapping = Appointment.objects.select_for_update().filter(
            doctor=doctor,
            scheduled_start__lt=slot_end,
            scheduled_end__gt=slot_start,
            status__in=['pending', 'doctor_approved', 'confirmed', 'in_progress']
        )

        if overlapping.count() >= availability.max_appointments_per_slot:
            raise ValidationError(_("This slot was just booked by someone else."))

        # 4. Create appointment
        # For fee, we might need a doctor profile fee or default fee
        # For now, let's assume a default fee or get it from doctor profile
        fee = getattr(doctor.doctor_profile, 'consultation_fee', 500.00) # Default or from profile

        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            ai_report_id=ai_report if isinstance(ai_report, (int, str)) and ai_report else None,
            consultation_type=consultation_type,
            scheduled_start=slot_start,
            scheduled_end=slot_end,
            timezone='UTC',
            status='pending',
            payment_status='unpaid',
            consultation_fee=fee,
            notes=notes
        )

        AppointmentEvents.dispatch(appointment, 'appointment.created')

        return appointment

