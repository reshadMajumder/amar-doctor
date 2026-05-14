import logging
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

logger = logging.getLogger(__name__)


class FinancialMonitoringService:
    """
    Read-only financial monitoring. All data is aggregated from existing payment/wallet models.
    Admins CANNOT mutate balances directly — all financial actions require the existing service layer.
    """

    ANOMALY_THRESHOLD_MULTIPLIER = 3.0  # Flag if > 3x average transaction amount

    @staticmethod
    def get_platform_revenue_overview() -> dict:
        from wallets.models import PlatformWallet, WalletTransaction
        from payments.models import PaymentTransaction

        wallet = PlatformWallet.get_instance()

        # Last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)

        recent_commissions = WalletTransaction.objects.filter(
            wallet_type='platform',
            transaction_type='platform_commission',
            created_at__gte=thirty_days_ago,
            status='completed',
        ).aggregate(
            total=Sum('amount'),
            count=Count('id'),
        )

        # Monthly breakdown (last 6 months)
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = (timezone.now().replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            rev = WalletTransaction.objects.filter(
                wallet_type='platform',
                transaction_type='platform_commission',
                created_at__gte=month_start,
                created_at__lt=month_end,
                status='completed',
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            monthly_data.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(rev),
            })

        return {
            'lifetime_revenue': float(wallet.lifetime_revenue),
            'available_balance': float(wallet.available_balance),
            'last_30_days_commission': float(recent_commissions.get('total') or 0),
            'last_30_days_transactions': recent_commissions.get('count', 0) or 0,
            'monthly_breakdown': monthly_data,
        }

    @staticmethod
    def get_doctor_payouts_overview() -> dict:
        from wallets.models import DoctorWallet, WalletTransaction

        # Total lifetime earnings across all doctors
        aggregates = DoctorWallet.objects.aggregate(
            total_lifetime_earnings=Sum('lifetime_earnings'),
            total_available=Sum('available_balance'),
            total_pending=Sum('pending_balance'),
            doctor_count=Count('id'),
        )

        # Recent withdrawals (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_withdrawals = WalletTransaction.objects.filter(
            wallet_type='doctor',
            transaction_type='withdrawal',
            created_at__gte=thirty_days_ago,
            status='completed',
        ).aggregate(total=Sum('amount'), count=Count('id'))

        return {
            'total_lifetime_doctor_earnings': float(aggregates.get('total_lifetime_earnings') or 0),
            'total_doctor_available_balance': float(aggregates.get('total_available') or 0),
            'total_doctor_pending_balance': float(aggregates.get('total_pending') or 0),
            'active_doctor_wallets': aggregates.get('doctor_count', 0) or 0,
            'withdrawals_last_30_days': float(recent_withdrawals.get('total') or 0),
            'withdrawal_count_last_30_days': recent_withdrawals.get('count', 0) or 0,
        }

    @staticmethod
    def get_refund_statistics() -> dict:
        from payments.models import PaymentTransaction

        total_refunds = PaymentTransaction.objects.filter(
            status='refunded'
        ).aggregate(total=Sum('amount'), count=Count('id'))

        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_refunds = PaymentTransaction.objects.filter(
            status='refunded',
            refunded_at__gte=thirty_days_ago,
        ).aggregate(total=Sum('amount'), count=Count('id'))

        return {
            'total_refund_amount': float(total_refunds.get('total') or 0),
            'total_refund_count': total_refunds.get('count', 0) or 0,
            'refunds_last_30_days_amount': float(recent_refunds.get('total') or 0),
            'refunds_last_30_days_count': recent_refunds.get('count', 0) or 0,
        }

    @staticmethod
    def detect_transaction_anomalies() -> list:
        """
        Flags PaymentTransactions that are unusually large (> ANOMALY_THRESHOLD_MULTIPLIER * avg).
        Returns a list of suspicious transaction dicts.
        """
        from payments.models import PaymentTransaction

        avg_result = PaymentTransaction.objects.filter(
            status='released'
        ).aggregate(avg=Avg('amount'))
        avg_amount = avg_result.get('avg') or Decimal('0')

        if avg_amount == 0:
            return []

        threshold = avg_amount * Decimal(str(FinancialMonitoringService.ANOMALY_THRESHOLD_MULTIPLIER))

        anomalies = PaymentTransaction.objects.filter(
            amount__gt=threshold
        ).select_related('user', 'appointment').values(
            'id', 'user__email', 'appointment__id',
            'amount', 'status', 'created_at', 'transaction_id'
        ).order_by('-amount')[:50]

        return [
            {
                **a,
                'amount': float(a['amount']),
                'created_at': a['created_at'].isoformat() if a['created_at'] else None,
                'threshold': float(threshold),
                'average': float(avg_amount),
            }
            for a in anomalies
        ]
