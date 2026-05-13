from celery import shared_task
from appointments.models import Appointment
from django.utils import timezone

@shared_task
def send_appointment_reminder(appointment_id):
    try:
        appointment = Appointment.objects.get(id=appointment_id)
        # Logic to send email/SMS reminder
        print(f"Reminder sent for appointment {appointment.booking_reference}")
    except Appointment.DoesNotExist:
        pass

@shared_task
def auto_cancel_unpaid_appointments():
    """
    Periodic task to cancel appointments that haven't been paid within a certain time.
    """
    expiry_time = timezone.now() - timezone.timedelta(hours=2)
    unpaid_appointments = Appointment.objects.filter(
        status='pending',
        payment_status='unpaid',
        created_at__lt=expiry_time
    )
    
    for appt in unpaid_appointments:
        appt.status = 'cancelled'
        appt.cancellation_reason = "Unpaid for too long"
        appt.save()
        # AppointmentEvents.dispatch(appt, 'appointment.cancelled')
