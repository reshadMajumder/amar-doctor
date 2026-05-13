from django.db.models.signals import post_save
from django.dispatch import receiver
from appointments.models import Appointment
from ..services.notification_service import NotificationService

@receiver(post_save, sender=Appointment)
def handle_appointment_notifications(sender, instance, created, **kwargs):
    """
    Handles notifications triggered by appointment status changes.
    """
    if created:
        # Notify Doctor about new booking
        NotificationService.create_notification(
            recipient=instance.doctor,
            n_type='appointment',
            title="New Appointment Request",
            message=f"You have a new appointment request from {instance.patient.get_full_name()}.",
            payload={'appointment_id': instance.id}
        )
    else:
        # Handle status changes
        if instance.status == 'confirmed':
            # Notify Patient
            NotificationService.create_notification(
                recipient=instance.patient,
                n_type='appointment',
                title="Appointment Confirmed",
                message=f"Your appointment with Dr. {instance.doctor.get_full_name()} has been confirmed.",
                payload={'appointment_id': instance.id}
            )
        elif instance.status == 'in_progress':
            # Notify Patient
            NotificationService.create_notification(
                recipient=instance.patient,
                n_type='consultation',
                title="Consultation Started",
                message=f"Dr. {instance.doctor.get_full_name()} has started the consultation. Join the chat now.",
                payload={'appointment_id': instance.id}
            )
        elif instance.status == 'cancelled':
            # Notify the other party
            # (Who cancelled? Let's assume we notify both if needed or handle logic)
            pass
