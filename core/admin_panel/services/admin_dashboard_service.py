import logging
from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes


class AdminDashboardService:
    """
    Aggregates platform-wide operational metrics for the admin dashboard.
    Results are Redis-cached for CACHE_TTL seconds to avoid heavy queries on every request.
    """

    @staticmethod
    def get_full_dashboard() -> dict:
        cache_key = 'admin_dashboard_full'
        cached = cache.get(cache_key)
        if cached:
            return cached

        data = {
            'users': AdminDashboardService._get_user_metrics(),
            'financial': AdminDashboardService._get_financial_metrics(),
            'appointments': AdminDashboardService._get_appointment_metrics(),
            'ai_metrics': AdminDashboardService._get_ai_metrics(),
            'system_health': AdminDashboardService._get_system_health(),
            'generated_at': timezone.now().isoformat(),
        }

        cache.set(cache_key, data, CACHE_TTL)
        return data

    @staticmethod
    def _get_user_metrics() -> dict:
        from django.contrib.auth import get_user_model
        from accounts.models import DoctorProfile
        User = get_user_model()

        total_patients = User.objects.filter(role='patient', is_active=True).count()
        total_doctors = User.objects.filter(role='doctor', is_active=True).count()
        pending_doctors = DoctorProfile.objects.filter(verification_status='pending').count()
        suspended_users = User.objects.filter(is_suspended=True).count()
        new_users_today = User.objects.filter(
            created_at__date=timezone.now().date()
        ).count()

        return {
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'pending_doctor_verifications': pending_doctors,
            'suspended_users': suspended_users,
            'new_users_today': new_users_today,
        }

    @staticmethod
    def _get_financial_metrics() -> dict:
        from wallets.models import PlatformWallet, WalletTransaction
        from payments.models import PaymentTransaction

        try:
            platform_wallet = PlatformWallet.get_instance()
            platform_revenue = float(platform_wallet.lifetime_revenue)
            available_balance = float(platform_wallet.available_balance)
        except Exception:
            platform_revenue = 0.0
            available_balance = 0.0

        # Payment volumes
        today = timezone.now().date()
        month_start = today.replace(day=1)

        monthly_volume = PaymentTransaction.objects.filter(
            status='released',
            released_at__date__gte=month_start,
        ).aggregate(total=Sum('amount'))['total'] or 0

        pending_payments = PaymentTransaction.objects.filter(
            status='paid_held'
        ).aggregate(total=Sum('amount'), count=Count('id'))

        refund_volume = PaymentTransaction.objects.filter(
            status='refunded'
        ).aggregate(total=Sum('amount'))['total'] or 0

        return {
            'platform_lifetime_revenue': platform_revenue,
            'platform_available_balance': available_balance,
            'monthly_released_volume': float(monthly_volume),
            'pending_escrow_count': pending_payments.get('count', 0) or 0,
            'pending_escrow_amount': float(pending_payments.get('total') or 0),
            'total_refund_volume': float(refund_volume),
        }

    @staticmethod
    def _get_appointment_metrics() -> dict:
        from appointments.models import Appointment

        total = Appointment.objects.count()
        completed = Appointment.objects.filter(status='completed').count()
        cancelled = Appointment.objects.filter(status='cancelled').count()
        in_progress = Appointment.objects.filter(status='in_progress').count()
        pending = Appointment.objects.filter(status='pending').count()

        today = timezone.now().date()
        today_count = Appointment.objects.filter(
            scheduled_start__date=today
        ).count()

        return {
            'total_appointments': total,
            'completed': completed,
            'cancelled': cancelled,
            'in_progress': in_progress,
            'pending': pending,
            'today_appointments': today_count,
            'completion_rate': round((completed / total * 100), 2) if total else 0,
        }

    @staticmethod
    def _get_ai_metrics() -> dict:
        from triage.models import AIReport, AITriageSession

        total_reports = AIReport.objects.count()
        emergency_detections = AITriageSession.objects.filter(
            emergency_detected=True
        ).count()
        failed_sessions = AITriageSession.objects.filter(
            status='cancelled'
        ).count()

        today = timezone.now().date()
        reports_today = AIReport.objects.filter(
            generated_at__date=today
        ).count()

        return {
            'total_ai_reports': total_reports,
            'emergency_detections': emergency_detections,
            'failed_or_cancelled_sessions': failed_sessions,
            'reports_generated_today': reports_today,
        }

    @staticmethod
    def _get_system_health() -> dict:
        """
        System health stub — returns Redis connectivity, queue status.
        WebSocket connection count requires external tracking (future).
        """
        redis_ok = False
        try:
            cache.set('__health_check__', '1', 5)
            redis_ok = cache.get('__health_check__') == '1'
        except Exception:
            pass

        return {
            'redis_connected': redis_ok,
            'websocket_connections': 'N/A (requires channel layer metrics)',
            'note': 'Full system health monitoring requires infrastructure-level metrics.',
        }
