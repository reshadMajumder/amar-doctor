from zoneinfo import ZoneInfo
from datetime import datetime, timedelta, time
from django.utils import timezone
from appointments.models import DoctorAvailability, DoctorBlockedSlot, Appointment
from appointments.utils.timezone_utils import combine_date_time_to_utc

class SlotGenerationService:
    @staticmethod
    def generate_slots(doctor, date_obj):
        """
        Generates available slots for a doctor on a specific date.
        Returns a list of dictionaries with start and end datetimes in UTC.
        """
        weekday = date_obj.weekday()
        availabilities = DoctorAvailability.objects.filter(
            doctor=doctor,
            weekday=weekday,
            is_active=True
        )

        if not availabilities.exists():
            return []

        all_generated_slots = []
        for availability in availabilities:
            tz_name = availability.timezone
            current_slot_start_utc = combine_date_time_to_utc(date_obj, availability.start_time, tz_name)
            work_end_utc = combine_date_time_to_utc(date_obj, availability.end_time, tz_name)
            
            # Handle breaks
            break_start_utc = None
            break_end_utc = None
            if availability.break_start_time and availability.break_end_time:
                break_start_utc = combine_date_time_to_utc(date_obj, availability.break_start_time, tz_name)
                break_end_utc = combine_date_time_to_utc(date_obj, availability.break_end_time, tz_name)

            slot_duration = timedelta(minutes=availability.slot_duration_minutes)

            while current_slot_start_utc + slot_duration <= work_end_utc:
                current_slot_end_utc = current_slot_start_utc + slot_duration
                
                # Check if in break
                if break_start_utc and (current_slot_start_utc < break_end_utc and current_slot_end_utc > break_start_utc):
                    current_slot_start_utc = break_end_utc
                    continue

                # Check if in past
                if current_slot_start_utc < timezone.now():
                    current_slot_start_utc = current_slot_end_utc
                    continue
                
                all_generated_slots.append({
                    'start': current_slot_start_utc,
                    'end': current_slot_end_utc,
                    'max_appointments': availability.max_appointments_per_slot,
                    'timezone': tz_name
                })
                current_slot_start_utc = current_slot_end_utc

        if not all_generated_slots:
            return []

        # Now filter the generated slots
        # Get the full range of generated slots to fetch overlapping data efficiently
        min_start = min(s['start'] for s in all_generated_slots)
        max_end = max(s['end'] for s in all_generated_slots)

        blocked_slots = DoctorBlockedSlot.objects.filter(
            doctor=doctor,
            start_datetime__lt=max_end,
            end_datetime__gt=min_start
        )

        existing_appointments = Appointment.objects.filter(
            doctor=doctor,
            scheduled_start__lt=max_end,
            scheduled_end__gt=min_start,
            status__in=['pending', 'doctor_approved', 'confirmed', 'in_progress']
        )

        available_slots = []
        for slot in all_generated_slots:
            # Check against blocked slots
            is_blocked = any(
                slot['start'] < blocked.end_datetime and slot['end'] > blocked.start_datetime 
                for blocked in blocked_slots
            )
            if is_blocked:
                continue

            # Check against existing appointments
            overlapping_appts_count = existing_appointments.filter(
                scheduled_start__lt=slot['end'],
                scheduled_end__gt=slot['start']
            ).count()

            if overlapping_appts_count < slot['max_appointments']:
                available_slots.append({
                    'start': slot['start'],
                    'end': slot['end'],
                    'timezone': slot['timezone']
                })

        return available_slots
