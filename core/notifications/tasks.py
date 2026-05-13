from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import Notification

@shared_task
def send_notification_email_task(notification_id):
    """
    Asynchronously sends an email notification.
    """
    try:
        notification = Notification.objects.select_related('recipient').get(id=notification_id)
        recipient = notification.recipient
        
        # Determine template based on type
        subject = f"[Amardoctor] {notification.title}"
        
        # Future: Use different HTML templates for different types
        context = {
            'user': recipient,
            'title': notification.title,
            'message': notification.message,
            'payload': notification.payload,
            'base_url': getattr(settings, 'PUBLIC_DOMAIN', 'http://127.0.0.1:8000')
        }
        
        # Try to render HTML, fallback to plain text
        try:
            html_message = render_to_string('notifications/email_notification.html', context)
        except:
            html_message = None
            
        send_mail(
            subject=subject,
            message=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log error
        print(f"Error sending email: {str(e)}")
        return False
