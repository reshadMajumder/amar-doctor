from django.db import transaction
from django.utils import timezone
from ..models import Prescription, PrescriptionItem
from notifications.services.notification_service import NotificationService

class PrescriptionService:
    @staticmethod
    @transaction.atomic
    def create_prescription(appointment, doctor, diagnosis_notes="", advice_notes="", follow_up=""):
        """
        Creates a draft prescription for an appointment.
        """
        if appointment.doctor != doctor:
            raise ValueError("Only the assigned doctor can create a prescription.")
            
        prescription, created = Prescription.objects.get_or_create(
            appointment=appointment,
            defaults={
                'patient': appointment.patient,
                'doctor': doctor,
                'diagnosis_notes': diagnosis_notes,
                'advice_notes': advice_notes,
                'follow_up_instructions': follow_up,
                'status': Prescription.STATUS_DRAFT
            }
        )
        return prescription

    @staticmethod
    @transaction.atomic
    def add_medicine(prescription, medicine_data):
        """
        Adds a medicine item to a draft prescription.
        """
        if prescription.status != Prescription.STATUS_DRAFT:
            raise ValueError("Cannot modify a finalized prescription.")
            
        return PrescriptionItem.objects.create(
            prescription=prescription,
            **medicine_data
        )

    @staticmethod
    @transaction.atomic
    def finalize_prescription(prescription):
        """
        Finalizes the prescription, making it immutable and triggering notifications.
        """
        if prescription.status == Prescription.STATUS_FINALIZED:
            return prescription
            
        prescription.status = Prescription.STATUS_FINALIZED
        prescription.finalized_at = timezone.now()
        prescription.issued_at = timezone.now()
        prescription.save()
        
        # Trigger notification
        NotificationService.create_notification(
            recipient=prescription.patient,
            n_type='prescription',
            title="Prescription Ready",
            message=f"Dr. {prescription.doctor.get_full_name()} has finalized your prescription.",
            payload={'prescription_id': prescription.id, 'appointment_id': prescription.appointment.id}
        )
        
        # Future: Generate PDF task
        from .prescription_pdf_service import generate_pdf_task
        generate_pdf_task.delay(prescription.id)
        
        return prescription
