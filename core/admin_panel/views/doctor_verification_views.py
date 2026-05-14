from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404

from accounts.models import DoctorProfile
from admin_panel.permissions.admin_permissions import IsDoctorVerificationAdmin, IsAnyAdmin
from admin_panel.services.doctor_verification_service import DoctorVerificationService
from admin_panel.selectors.doctor_selectors import (
    get_pending_doctors, get_all_doctors, get_doctors_by_status
)
from admin_panel.serializers.doctor_verification import (
    DoctorProfileAdminSerializer,
    DoctorApprovalSerializer,
    DoctorRejectionSerializer,
    DoctorSuspensionSerializer,
)


class DoctorPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PendingDoctorsListView(APIView):
    """
    GET /api/v1/admin/doctors/pending/
    Lists all doctors with verification_status='pending'.
    Requires: doctor_verification_admin or super_admin
    """
    permission_classes = [IsDoctorVerificationAdmin]

    def get(self, request):
        qs = get_pending_doctors()
        paginator = DoctorPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = DoctorProfileAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AllDoctorsListView(APIView):
    """
    GET /api/v1/admin/doctors/
    Lists all doctors with optional status filter.
    Requires: any admin
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        filter_status = request.query_params.get('status')
        if filter_status:
            qs = get_doctors_by_status(filter_status)
        else:
            qs = get_all_doctors()
        paginator = DoctorPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = DoctorProfileAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class DoctorDetailView(APIView):
    """
    GET /api/v1/admin/doctors/{id}/
    Retrieve full doctor profile for admin review.
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request, pk):
        profile = get_object_or_404(DoctorProfile, pk=pk)
        return Response(DoctorProfileAdminSerializer(profile).data)


class ApproveDoctorView(APIView):
    """
    PATCH /api/v1/admin/doctors/{id}/approve/
    Approves a pending doctor.
    Requires: doctor_verification_admin or super_admin
    """
    permission_classes = [IsDoctorVerificationAdmin]

    def patch(self, request, pk):
        serializer = DoctorApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = DoctorVerificationService.approve_doctor(
                doctor_profile_id=pk,
                admin_user=request.user,
                notes=serializer.validated_data.get('notes', ''),
                request=request,
            )
            return Response({
                'message': 'Doctor approved successfully.',
                'doctor': DoctorProfileAdminSerializer(profile).data,
            })
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RejectDoctorView(APIView):
    """
    PATCH /api/v1/admin/doctors/{id}/reject/
    Rejects a doctor's application with mandatory notes.
    Requires: doctor_verification_admin or super_admin
    """
    permission_classes = [IsDoctorVerificationAdmin]

    def patch(self, request, pk):
        serializer = DoctorRejectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = DoctorVerificationService.reject_doctor(
                doctor_profile_id=pk,
                admin_user=request.user,
                notes=serializer.validated_data['notes'],
                request=request,
            )
            return Response({
                'message': 'Doctor rejected.',
                'doctor': DoctorProfileAdminSerializer(profile).data,
            })
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SuspendDoctorView(APIView):
    """
    PATCH /api/v1/admin/doctors/{id}/suspend/
    Suspends an approved doctor with a reason.
    Requires: doctor_verification_admin or super_admin
    """
    permission_classes = [IsDoctorVerificationAdmin]

    def patch(self, request, pk):
        serializer = DoctorSuspensionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = DoctorVerificationService.suspend_doctor(
                doctor_profile_id=pk,
                admin_user=request.user,
                reason=serializer.validated_data['reason'],
                request=request,
            )
            return Response({
                'message': 'Doctor suspended.',
                'doctor': DoctorProfileAdminSerializer(profile).data,
            })
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
