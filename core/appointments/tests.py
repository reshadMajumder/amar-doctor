import pytest
from django.utils import timezone
from datetime import time, date, timedelta, datetime
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

        # Test for a dynamic Monday in the future (next Monday)
        today = date.today()
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        test_date = today + timedelta(days=days_ahead)
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

        today = date.today()
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        test_date = today + timedelta(days=days_ahead)
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

@pytest.mark.django_db
class TestAppointmentWorkflow:
    @pytest.fixture
    def setup_data(self):
        doctor = User.objects.create_user(email='doc@test.com', password='password123', full_name='Dr. Doc', role='doctor')
        patient = User.objects.create_user(email='pat@test.com', password='password123', full_name='Pat', role='patient')
        return doctor, patient

    def test_create_appointment_success(self, setup_data):
        doctor, patient = setup_data
        start = timezone.now() + timedelta(days=1)
        end = start + timedelta(minutes=30)
        
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_start=start,
            scheduled_end=end,
            status='pending',
            consultation_fee=500
        )
        
        assert appointment.id is not None
        assert appointment.status == 'pending'
        assert appointment.patient == patient

    def test_status_transition_to_completed(self, setup_data):
        doctor, patient = setup_data
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timedelta(minutes=30),
            status='confirmed',
            consultation_fee=500
        )
        
        appointment.status = 'completed'
        appointment.save()
        
        assert appointment.status == 'completed'

from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse

@pytest.mark.django_db
class TestAppointmentAPI:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_users(self):
        doctor = User.objects.create_user(email='doc_api@test.com', password='password123', full_name='Dr. API', role='doctor', is_verified=True)
        patient = User.objects.create_user(email='pat_api@test.com', password='password123', full_name='Pat API', role='patient', is_verified=True)
        return doctor, patient

    def test_list_appointments_patient(self, api_client, setup_users):
        doctor, patient = setup_users
        api_client.force_authenticate(user=patient)
        
        url = reverse('appointment-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_doctor_availability_api(self, api_client, setup_users):
        doctor, patient = setup_users
        api_client.force_authenticate(user=doctor)
        
        url = reverse('doctor-availability-list')
        data = {
            "weekday": 1,
            "start_time": "09:00:00",
            "end_time": "12:00:00",
            "slot_duration_minutes": 30
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_available_slots_api(self, api_client, setup_users):
        doctor, patient = setup_users
        api_client.force_authenticate(user=patient)
        
        # Setup availability for doctor on Monday
        DoctorAvailability.objects.create(
            doctor=doctor,
            weekday=0, # Monday
            start_time=time(9, 0),
            end_time=time(11, 0),
            slot_duration_minutes=30,
            timezone='UTC'
        )
        
        url = reverse('available-slots', kwargs={'doctor_id': doctor.id})
        response = api_client.get(url, {'date': '2026-05-25'})  # 2026-05-25 is a Monday
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 4
        assert response.data[0]['start'] is not None
        assert response.data[0]['end'] is not None
        assert response.data[0]['timezone'] == 'UTC'
