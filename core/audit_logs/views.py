from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from audit_logs.selectors import get_audit_logs
from audit_logs.serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AuditLogListView(APIView):
    """
    GET /api/v1/admin/audit-logs/
    Read-only admin endpoint for searching audit logs.
    Query params: actor_id, action_type, target_model, target_id, date_from, date_to
    """

    def get(self, request):
        from admin_panel.permissions.admin_permissions import IsAnyAdmin
        perm = IsAnyAdmin()
        if not perm.has_permission(request, self):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        qs = get_audit_logs(
            actor_id=request.query_params.get('actor_id'),
            action_type=request.query_params.get('action_type'),
            target_model=request.query_params.get('target_model'),
            target_id=request.query_params.get('target_id'),
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
        )

        paginator = AuditLogPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
