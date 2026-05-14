from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404

from admin_panel.permissions.admin_permissions import IsOperationsAdmin, IsAnyAdmin
from admin_panel.services.moderation_service import ModerationService
from admin_panel.selectors.dashboard_selectors import get_all_users
from admin_panel.serializers.moderation import (
    UserAdminSerializer, UserSuspensionSerializer, UserFlagSerializer
)


class UserPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 200


class UserListView(APIView):
    """
    GET /api/v1/admin/users/
    List all platform users with optional filters.
    Query params: role, is_suspended, is_active, search
    Requires: any admin
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        is_suspended = request.query_params.get('is_suspended')
        is_active = request.query_params.get('is_active')

        qs = get_all_users(
            role=request.query_params.get('role'),
            is_suspended=True if is_suspended == 'true' else (False if is_suspended == 'false' else None),
            is_active=True if is_active == 'true' else (False if is_active == 'false' else None),
            search=request.query_params.get('search'),
        )
        paginator = UserPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SuspendUserView(APIView):
    """
    PATCH /api/v1/admin/users/{id}/suspend/
    Suspend a user account.
    Requires: operations_admin or super_admin
    """
    permission_classes = [IsOperationsAdmin]

    def patch(self, request, pk):
        serializer = UserSuspensionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = ModerationService.suspend_user(
                user_id=pk,
                admin_user=request.user,
                reason=serializer.validated_data['reason'],
                request=request,
            )
            return Response({
                'message': 'User suspended.',
                'user': UserAdminSerializer(user).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UnsuspendUserView(APIView):
    """
    PATCH /api/v1/admin/users/{id}/unsuspend/
    Lift a user's suspension.
    Requires: operations_admin or super_admin
    """
    permission_classes = [IsOperationsAdmin]

    def patch(self, request, pk):
        try:
            user = ModerationService.unsuspend_user(
                user_id=pk,
                admin_user=request.user,
                request=request,
            )
            return Response({
                'message': 'User suspension lifted.',
                'user': UserAdminSerializer(user).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DeactivateUserView(APIView):
    """
    PATCH /api/v1/admin/users/{id}/deactivate/
    Permanently deactivate a user account.
    Requires: operations_admin or super_admin
    """
    permission_classes = [IsOperationsAdmin]

    def patch(self, request, pk):
        reason = request.data.get('reason', '')
        try:
            user = ModerationService.deactivate_user(
                user_id=pk,
                admin_user=request.user,
                reason=reason,
                request=request,
            )
            return Response({
                'message': 'User deactivated.',
                'user': UserAdminSerializer(user).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FlagUserView(APIView):
    """
    POST /api/v1/admin/users/{id}/flag/
    Flag a user for suspicious activity (audit trail only).
    Requires: operations_admin or super_admin
    """
    permission_classes = [IsOperationsAdmin]

    def post(self, request, pk):
        serializer = UserFlagSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            ModerationService.flag_suspicious_activity(
                user_id=pk,
                admin_user=request.user,
                notes=serializer.validated_data['notes'],
                request=request,
            )
            return Response({'message': 'User flagged for suspicious activity. Audit log created.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
