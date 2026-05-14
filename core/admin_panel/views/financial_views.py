from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from admin_panel.permissions.admin_permissions import IsFinanceAdmin
from admin_panel.services.financial_monitoring_service import FinancialMonitoringService
from admin_panel.selectors.financial_selectors import get_all_transactions
from admin_panel.serializers.financial import PaymentTransactionAdminSerializer


class FinancialPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 200


class FinancialOverviewView(APIView):
    """
    GET /api/v1/admin/financial/overview/
    Platform revenue, doctor payouts, refund stats.
    Requires: finance_admin or super_admin
    """
    permission_classes = [IsFinanceAdmin]

    def get(self, request):
        data = {
            'revenue': FinancialMonitoringService.get_platform_revenue_overview(),
            'payouts': FinancialMonitoringService.get_doctor_payouts_overview(),
            'refunds': FinancialMonitoringService.get_refund_statistics(),
            'anomalies': FinancialMonitoringService.detect_transaction_anomalies(),
        }
        return Response({'status': 'ok', 'financial': data})


class TransactionListView(APIView):
    """
    GET /api/v1/admin/transactions/
    Paginated list of all payment transactions.
    Query params: status, date_from, date_to
    Requires: finance_admin or super_admin
    """
    permission_classes = [IsFinanceAdmin]

    def get(self, request):
        qs = get_all_transactions(
            status=request.query_params.get('status'),
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
        )
        paginator = FinancialPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PaymentTransactionAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class DoctorPayoutsView(APIView):
    """
    GET /api/v1/admin/payouts/
    Doctor payout overview and statistics.
    Requires: finance_admin or super_admin
    """
    permission_classes = [IsFinanceAdmin]

    def get(self, request):
        data = FinancialMonitoringService.get_doctor_payouts_overview()
        return Response({'status': 'ok', 'payouts': data})
