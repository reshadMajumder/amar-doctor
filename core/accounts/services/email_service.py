import logging
import os
from typing import List

import requests
import resend
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
            # Use fail_silently=True so Celery workers don't raise on transient
            # network issues (production hosts sometimes block outbound SMTP).
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=True,
            )
        except OSError as e:
            # Network-related errors (socket/connect) - log and continue.
            logger.error("SMTP network error sending email to %s: %s", to_email, e)
            return False
        except Exception as e:
            # Non-network errors - log and continue without raising to avoid
            # crashing workers. If you'd prefer to surface these, change to
            # `fail_silently=False` and re-raise here.
            logger.exception("Failed to send email to %s: %s", to_email, e)
            return False
        return True


class ResendEmailProvider(EmailProvider):
    """Simple Resend.com provider fallback using their HTTP API.

    Expects `RESEND_API_KEY` in settings or environment.
    """

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or getattr(settings, "RESEND_API_KEY", None) or os.getenv("RESEND_API_KEY")

    def send(self, subject, to_email, html_content):
        if not self.api_key:
            logging.getLogger(__name__).warning("Resend API key not configured; cannot send via Resend")
            return False

        resend.api_key = self.api_key
        try:
            params = {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": to_email,
                "subject": subject,
                "html": html_content,
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            logging.getLogger(__name__).error("Resend SDK error for %s: %s", to_email, e)
            return False

class EmailService:
    def __init__(self, provider: EmailProvider = None):
        if provider:
            self.provider = provider
        else:
            provider_type = getattr(settings, 'EMAIL_PROVIDER', 'smtp').lower()
            if provider_type == 'resend':
                self.provider = ResendEmailProvider()
            else:
                self.provider = SMTPEmailProvider()

    def send_registration_otp(self, email, otp):
        subject = "Your Registration OTP - Amardoctor"
        context = {'otp': otp}
        # Assuming we have a template at accounts/templates/emails/registration_otp.html
        html_content = render_to_string('emails/registration_otp.html', context)
        return self.provider.send(subject, email, html_content)

    def send_login_otp(self, email, otp):
        subject = "Your Login OTP - Amardoctor"
        context = {'otp': otp}
        html_content = render_to_string('emails/login_otp.html', context)
        return self.provider.send(subject, email, html_content)

    def send_password_reset_otp(self, email, otp):
        subject = "Password Reset OTP - Amardoctor"
        context = {'otp': otp}
        html_content = render_to_string('emails/password_reset_otp.html', context)
        return self.provider.send(subject, email, html_content)
