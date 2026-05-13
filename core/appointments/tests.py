import pytest
from django.utils import timezone
from datetime import time, date, timedelta
from accounts.models import User
from appointments.models import DoctorAvailability, Appointment
from appointments.services.slot_generation_service import SlotGenerationService
from zoneinfo import ZoneInfo

@pytest.mark.django_db
class TestSlotGeneration:
    @pytest.fixture
    def doctor(self):
        return User.objects.create(
            email='doctor@test.com',
            full_name='Dr. Test',
            role='doctor'
        )

    def test_generate_basic_slots(self, doctor):
        # Create availability: Monday 09:00 - 11:00, 30 min slots
        availability = DoctorAvailability.objects.create(
            doctor=doctor,
            weekday=0, # Monday
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_duration_minutes=30,
            timezone='UTC'
        )

        # Test for a specific Monday
        test_date = date(2026, 5, 18) # This is a Monday
        slots = SlotGenerationService.generate_slots(doctor, test_date)

        assert len(slots) == 4
        assert slots[0]['start'].time() == time(9, 0)
        assert slots[3]['end'].time() == time(11, 0)

    def test_exclude_booked_slots(self, doctor):
        # Create availability
        DoctorAvailability.objects.create(
            doctor=doctor,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(10, 0),
            slot_duration_minutes=30,
            timezone='UTC'
        )

        test_date = date(2026, 5, 18)
        slot_start = datetime.combine(test_date, time(9, 0), tzinfo=ZoneInfo("UTC"))
        slot_end = slot_start + timedelta(minutes=30)

        # Book the first slot
        patient = User.objects.create(email='patient@test.com', role='patient')
        Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_start=slot_start,
            scheduled_end=slot_end,
            status='confirmed',
            consultation_fee=500
        )

        slots = SlotGenerationService.generate_slots(doctor, test_date)
        
        # Only the second slot should be available
        assert len(slots) == 1
        assert slots[0]['start'].time() == time(9, 30)

from datetime import datetime
