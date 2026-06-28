from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class AppointmentEvents:
    @staticmethod
    def dispatch(appointment, event_type, extra_data=None):
        channel_layer = get_channel_layer()
        
        data = {
            'appointment_id': str(appointment.id),
            'booking_reference': appointment.booking_reference,
            'status': appointment.status,
            **(extra_data or {})
        }

        # Notify Patient
        async_to_sync(channel_layer.group_send)(
            f'user_{appointment.patient.id}',
            {
                'type': 'appointment_event',
                'event_type': event_type,
                'data': data
            }
        )

        # Notify Doctor
        async_to_sync(channel_layer.group_send)(
            f'user_{appointment.doctor.id}',
            {
                'type': 'appointment_event',
                'event_type': event_type,
                'data': data
            }
        )

        # Trigger DB Notifications and delivery channels
        from notifications.services.notification_service import NotificationService
        
        patient_title = None
        patient_msg = None
        doctor_title = None
        doctor_msg = None
        
        doctor_name = appointment.doctor.full_name
        patient_name = appointment.patient.full_name
        date_str = appointment.scheduled_start.strftime("%b %d, %Y at %I:%M %p") if appointment.scheduled_start else ""

        if event_type == 'appointment.doctor_approved':
            patient_title = "Appointment Approved"
            patient_msg = f"Dr. {doctor_name} has approved your appointment request for {date_str}."
            doctor_title = "Appointment Confirmed"
            doctor_msg = f"You have approved the appointment request from {patient_name} for {date_str}."
            
        elif event_type == 'appointment.rejected':
            patient_title = "Appointment Rejected"
            patient_msg = f"Dr. {doctor_name} has rejected your appointment request for {date_str}. The fee has been refunded to your wallet."
            doctor_title = "Appointment Rejected"
            doctor_msg = f"You have rejected the appointment request from {patient_name} for {date_str}."
            
        elif event_type == 'appointment.cancelled':
            patient_title = "Appointment Cancelled"
            patient_msg = f"Your appointment with Dr. {doctor_name} scheduled for {date_str} has been cancelled."
            doctor_title = "Appointment Cancelled"
            doctor_msg = f"The appointment with Patient {patient_name} scheduled for {date_str} has been cancelled."
            
        elif event_type == 'appointment.confirmed':
            patient_title = "Consultation Started"
            patient_msg = f"Your consultation session with Dr. {doctor_name} has started. You can join the chat now."
            doctor_title = "Consultation Started"
            doctor_msg = f"Your consultation session with Patient {patient_name} has started."

        elif event_type == 'appointment.completed':
            patient_title = "Consultation Completed"
            patient_msg = f"Your consultation session with Dr. {doctor_name} has been completed. A prescription has been uploaded to your profile."
            doctor_title = "Consultation Completed"
            doctor_msg = f"Your consultation session with Patient {patient_name} has been completed and payment has been released."

        if patient_title and patient_msg:
            try:
                NotificationService.create_notification(
                    recipient=appointment.patient,
                    n_type='booking',
                    title=patient_title,
                    message=patient_msg,
                    payload={'appointment_id': appointment.id}
                )
            except Exception as e:
                print("Error creating patient event notification:", e)
                
        if doctor_title and doctor_msg:
            try:
                NotificationService.create_notification(
                    recipient=appointment.doctor,
                    n_type='booking',
                    title=doctor_title,
                    message=doctor_msg,
                    payload={'appointment_id': appointment.id}
                )
            except Exception as e:
                print("Error creating doctor event notification:", e)
