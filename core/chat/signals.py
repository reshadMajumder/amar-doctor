from django.db.models.signals import post_save
from django.dispatch import receiver
from appointments.models import Appointment
from .services.room_service import RoomService

@receiver(post_save, sender=Appointment)
def handle_appointment_status_change(sender, instance, **kwargs):
    """
    Trigger room creation when appointment is confirmed.
    """
    if instance.status in ['doctor_approved', 'confirmed']:
        room = RoomService.create_room_for_appointment(instance)
        
        # Notify about chat room ready
        from notifications.services.notification_service import NotificationService
        NotificationService.create_notification(
            recipient=instance.patient,
            n_type='consultation',
            title="Chat Room Ready",
            message=f"A consultation room has been created for your appointment with Dr. {instance.doctor.get_full_name()}.",
            payload={'room_id': room.id, 'appointment_id': instance.id}
        )
        NotificationService.create_notification(
            recipient=instance.doctor,
            n_type='consultation',
            title="Chat Room Ready",
            message=f"A consultation room has been created for your appointment with {instance.patient.get_full_name()}.",
            payload={'room_id': room.id, 'appointment_id': instance.id}
        )
