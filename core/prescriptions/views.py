from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import Prescription, PrescriptionItem
from .serializers import PrescriptionSerializer, PrescriptionDetailSerializer, PrescriptionItemSerializer
from .services.prescription_service import PrescriptionService
from .services.prescription_pdf_service import PrescriptionPDFService
from appointments.models import Appointment

class PrescriptionCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def perform_create(self, serializer):
        appointment_id = serializer.validated_data['appointment_id']
        appointment = get_object_or_404(Appointment, id=appointment_id)
        
        # Logic is in service
        prescription = PrescriptionService.create_prescription(
            appointment=appointment,
            doctor=self.request.user,
            diagnosis_notes=serializer.validated_data.get('diagnosis_notes', ""),
            advice_notes=serializer.validated_data.get('advice_notes', ""),
            follow_up=serializer.validated_data.get('follow_up_instructions', "")
        )
        serializer.instance = prescription

class PrescriptionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Prescription.objects.filter(doctor=user)
        return Prescription.objects.filter(patient=user)

class PrescriptionItemAddView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrescriptionItemSerializer

    def post(self, request, *args, **kwargs):
        prescription_id = self.kwargs['pk']
        prescription = get_object_or_404(Prescription, id=prescription_id, doctor=request.user)
        
        item = PrescriptionService.add_medicine(prescription, request.data)
        return Response(self.get_serializer(item).data, status=status.HTTP_201_CREATED)

class PrescriptionFinalizeView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        prescription = get_object_or_404(Prescription, id=self.kwargs['pk'], doctor=request.user)
        finalized = PrescriptionService.finalize_prescription(prescription)
        return Response(PrescriptionSerializer(finalized).data)

class PrescriptionPDFDownloadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        prescription = get_object_or_404(Prescription, id=self.kwargs['pk'])
        
        # Ensure user is part of the prescription
        if prescription.patient != request.user and prescription.doctor != request.user:
            return Response({"detail": "Permission denied."}, status=403)
            
        if prescription.status != Prescription.STATUS_FINALIZED:
            return Response({"detail": "Prescription not finalized yet."}, status=400)

        pdf_content = PrescriptionPDFService.generate_pdf(prescription.id)
        if not pdf_content:
            return Response({"detail": "Error generating PDF."}, status=500)

        response = HttpResponse(pdf_content, content_type='application/pdf')
        filename = f"Prescription_{prescription.id}_{prescription.patient.id}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

class PatientPrescriptionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrescriptionDetailSerializer

    def get_queryset(self):
        return Prescription.objects.filter(patient=self.request.user, status=Prescription.STATUS_FINALIZED)
