from celery import shared_task
from accounts.services.email_service import EmailService

@shared_task
def send_registration_otp_task(email, otp):
    email_service = EmailService()
    email_service.send_registration_otp(email, otp)

@shared_task
def send_login_otp_task(email, otp):
    email_service = EmailService()
    email_service.send_login_otp(email, otp)

@shared_task
def send_password_reset_otp_task(email, otp):
    email_service = EmailService()
    email_service.send_password_reset_otp(email, otp)
