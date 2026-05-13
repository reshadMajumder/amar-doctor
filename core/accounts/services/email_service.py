import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)

class EmailProvider:
    def send(self, subject, to_email, html_content):
        raise NotImplementedError("Email providers must implement the send method.")

class SMTPEmailProvider(EmailProvider):
    def send(self, subject, to_email, html_content):
        plain_message = strip_tags(html_content)
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise

class EmailService:
    def __init__(self, provider: EmailProvider = None):
        self.provider = provider or SMTPEmailProvider()

    def send_registration_otp(self, email, otp):
        subject = "Your Registration OTP - Amardoctor"
        context = {'otp': otp}
        # Assuming we have a template at accounts/templates/emails/registration_otp.html
        html_content = render_to_string('emails/registration_otp.html', context)
        self.provider.send(subject, email, html_content)

    def send_login_otp(self, email, otp):
        subject = "Your Login OTP - Amardoctor"
        context = {'otp': otp}
        html_content = render_to_string('emails/login_otp.html', context)
        self.provider.send(subject, email, html_content)

    def send_password_reset_otp(self, email, otp):
        subject = "Password Reset OTP - Amardoctor"
        context = {'otp': otp}
        html_content = render_to_string('emails/password_reset_otp.html', context)
        self.provider.send(subject, email, html_content)
