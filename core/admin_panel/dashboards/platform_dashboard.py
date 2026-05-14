from admin_panel.services.admin_dashboard_service import AdminDashboardService
from admin_panel.analytics.platform_analytics import PlatformAnalytics

class PlatformDashboard:
    """
    Main entry point for retrieving consolidated dashboard data.
    """
    
    @staticmethod
    def get_summary():
        return AdminDashboardService.get_full_dashboard()

    @staticmethod
    def get_analytics():
        return {
            'appointment_trends': list(PlatformAnalytics.get_monthly_appointment_trends()),
            'specialization_distribution': list(PlatformAnalytics.get_specialization_distribution()),
        }
