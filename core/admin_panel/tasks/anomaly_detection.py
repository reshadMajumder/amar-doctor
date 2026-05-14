import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from admin_panel.services.financial_monitoring_service import FinancialMonitoringService
from triage.models import AITriageSession
from notifications.services.notification_service import NotificationService
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task
def check_payout_anomalies():
    """
    Periodic task to detect and flag transaction anomalies.
    """
    anomalies = FinancialMonitoringService.detect_transaction_anomalies()
    if anomalies:
        # Notify super admins and finance admins
        admins = User.objects.filter(
            role='admin',
            admin_profile__admin_role__in=['super_admin', 'finance_admin']
        )
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                n_type='system',
                title='Financial Anomaly Detected',
                message=f'Detected {len(anomalies)} suspicious transactions. Please review the financial dashboard.',
                payload={'anomalies_count': len(anomalies), 'source': 'anomaly_detection'}
            )
        logger.warning(f"Detected {len(anomalies)} transaction anomalies.")

@shared_task
def check_ai_failure_rate():
    """
    Periodic task to check AI processing failure rate.
    """
    last_hour = timezone.now() - timedelta(hours=1)
    sessions = AITriageSession.objects.filter(started_at__gte=last_hour)
    total_count = sessions.count()
    if total_count == 0:
        return

    failed_count = sessions.filter(status='cancelled').count()
    failure_rate = (failed_count / total_count) * 100

    if failure_rate > 10:  # If failure rate > 10%
        admins = User.objects.filter(
            role='admin',
            admin_profile__admin_role__in=['super_admin', 'operations_admin']
        )
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                n_type='system',
                title='High AI Failure Rate',
                message=f'AI triage failure rate is at {failure_rate:.2f}% in the last hour.',
                payload={'failure_rate': failure_rate, 'source': 'system_health'}
            )
        logger.error(f"High AI failure rate: {failure_rate:.2f}%")

@shared_task
def send_admin_daily_digest():
    """
    Sends a daily operational digest to super admins.
    """
    from admin_panel.services.admin_dashboard_service import AdminDashboardService
    stats = AdminDashboardService.get_full_dashboard()
    
    admins = User.objects.filter(role='admin', admin_profile__admin_role='super_admin')
    for admin in admins:
        # Future: Send formatted email
        logger.info(f"Sending daily digest to {admin.email}")
