from django.db.models import Count, Sum, Avg, F, Q
from django.db.models.functions import TruncMonth, TruncDay
from appointments.models import Appointment
from triage.models import AIReport
from django.utils import timezone
from datetime import timedelta

class PlatformAnalytics:
    """
    Advanced analytics queries for platform growth and performance.
    """

    @staticmethod
    def get_monthly_appointment_trends():
        six_months_ago = timezone.now() - timedelta(days=180)
        return Appointment.objects.filter(
            scheduled_start__gte=six_months_ago
        ).annotate(
            month=TruncMonth('scheduled_start')
        ).values('month').annotate(
            count=Count('id'),
            revenue=Sum('consultation_fee')
        ).order_by('month')

    @staticmethod
    def get_specialization_distribution():
        from accounts.models import DoctorProfile
        return DoctorProfile.objects.values(
            'specialization'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

    @staticmethod
    def get_ai_diagnostic_accuracy_metrics():
        # Future: Compare AI suggestion with doctor's final diagnosis
        return {
            'note': 'Diagnostic accuracy requires doctor feedback data integration.'
        }
