from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from admin_panel.permissions.admin_permissions import IsAnyAdmin
from admin_panel.services.admin_dashboard_service import AdminDashboardService


class AdminDashboardView(APIView):
    """
    GET /api/v1/admin/dashboard/
    Returns aggregated platform KPIs — cached for 5 minutes.
    Requires: any admin role
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        data = AdminDashboardService.get_full_dashboard()
        return Response({'status': 'ok', 'dashboard': data})


class SystemHealthView(APIView):
    """
    GET /api/v1/admin/system-health/
    Returns basic system health indicators (Redis, queue).
    Requires: any admin role
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        from admin_panel.services.admin_dashboard_service import AdminDashboardService
        health = AdminDashboardService._get_system_health()
        return Response({'status': 'ok', 'health': health})
