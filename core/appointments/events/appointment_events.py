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
