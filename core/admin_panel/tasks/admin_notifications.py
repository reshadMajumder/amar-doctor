import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from notifications.services.notification_service import NotificationService

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task
def notify_admins_new_doctor_registration(doctor_id):
    """
    Notifies verification admins when a new doctor registers.
    """
    from accounts.models import User as UserAccount
    try:
        doctor = UserAccount.objects.get(id=doctor_id)
        admins = User.objects.filter(
            role='admin', 
            admin_profile__admin_role__in=['super_admin', 'doctor_verification_admin']
        )
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                n_type='system',
                title='New Doctor Registration',
                message=f'Dr. {doctor.full_name} has registered and is pending verification.',
                payload={'doctor_id': doctor_id, 'action': 'verification'}
            )
    except Exception as e:
        logger.error(f"Error notifying admins of new doctor registration: {e}")

@shared_task
def notify_admins_system_critical_event(title, message, roles=None):
    """
    Generic task to notify specific admin roles about critical system events.
    """
    if roles is None:
        roles = ['super_admin']
        
    admins = User.objects.filter(role='admin', admin_profile__admin_role__in=roles)
    for admin in admins:
        NotificationService.create_notification(
            recipient=admin,
            n_type='system',
            title=title,
            message=message,
            payload={'critical': True}
        )
