from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone

from admin_panel.permissions.admin_permissions import IsSupportAdmin, IsAnyAdmin
from admin_panel.models.dispute import ConsultationDispute
from admin_panel.serializers.dispute import (
    ConsultationDisputeSerializer, DisputeCreateSerializer, DisputeUpdateSerializer
)
from appointments.models import Appointment
from audit_logs.services.audit_log_service import AuditLogService
from audit_logs.models import AuditLog


class DisputePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'


class DisputeListCreateView(APIView):
    """
    GET /api/v1/admin/disputes/ — list all disputes
    POST /api/v1/admin/disputes/ — open a new dispute
    Requires: support_admin or super_admin
    """
    permission_classes = [IsSupportAdmin]

    def get(self, request):
        qs = ConsultationDispute.objects.select_related(
            'appointment', 'opened_by', 'resolved_by'
        ).order_by('-created_at')

        filter_status = request.query_params.get('status')
        if filter_status:
            qs = qs.filter(status=filter_status)

        paginator = DisputePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ConsultationDisputeSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = DisputeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.get(pk=serializer.validated_data['appointment_id'])
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        dispute = ConsultationDispute.objects.create(
            appointment=appointment,
            opened_by=request.user,
            reason=serializer.validated_data['reason'],
            status=ConsultationDispute.STATUS_OPEN,
        )

        AuditLogService.log(
            actor=request.user,
            action_type=AuditLog.ACTION_CREATE,
            target_obj=dispute,
            request=request,
            appointment_id=appointment.id,
        )

        return Response(
            ConsultationDisputeSerializer(dispute).data,
            status=status.HTTP_201_CREATED
        )


class DisputeDetailView(APIView):
    """
    GET /api/v1/admin/disputes/{id}/
    PATCH /api/v1/admin/disputes/{id}/ — update status/resolution
    Requires: support_admin or super_admin
    """
    permission_classes = [IsSupportAdmin]

    def get(self, request, pk):
        try:
            dispute = ConsultationDispute.objects.select_related(
                'appointment', 'opened_by', 'resolved_by'
            ).get(pk=pk)
        except ConsultationDispute.DoesNotExist:
            return Response({'error': 'Dispute not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(ConsultationDisputeSerializer(dispute).data)

    def patch(self, request, pk):
        try:
            dispute = ConsultationDispute.objects.get(pk=pk)
        except ConsultationDispute.DoesNotExist:
            return Response({'error': 'Dispute not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = DisputeUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        previous_status = dispute.status
        new_status = serializer.validated_data['status']

        dispute.status = new_status
        if serializer.validated_data.get('resolution_notes'):
            dispute.resolution_notes = serializer.validated_data['resolution_notes']
        if new_status in (ConsultationDispute.STATUS_RESOLVED, ConsultationDispute.STATUS_REJECTED):
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
        dispute.save()

        AuditLogService.log(
            actor=request.user,
            action_type=AuditLog.ACTION_UPDATE,
            target_obj=dispute,
            previous_data={'status': previous_status},
            new_data={'status': new_status},
            request=request,
        )

        return Response(ConsultationDisputeSerializer(dispute).data)
