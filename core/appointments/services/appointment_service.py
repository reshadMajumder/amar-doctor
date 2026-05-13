from django.db import transaction
from django.utils import timezone
from appointments.models import Appointment, AppointmentStatusLog
from appointments.events.appointment_events import AppointmentEvents

class AppointmentService:
    @staticmethod
    @transaction.atomic
    def update_status(appointment, new_status, changed_by, reason=None, metadata=None):
        """
        Updates appointment status and logs the transition.
        """
        previous_status = appointment.status
        if previous_status == new_status:
            return appointment

        # Validate transition
        AppointmentService._validate_transition(previous_status, new_status)

        # Enforce payment for approval
        if new_status == 'doctor_approved' and appointment.payment_status == 'unpaid':
            raise ValueError("Appointment must be paid before doctor can approve it.")

        appointment.status = new_status
        appointment.save()

        # Handle financial side effects
        from payments.services.escrow_service import EscrowService
        if new_status == 'completed':
            EscrowService.release_payment(appointment)
        elif new_status in ['cancelled', 'rejected']:
            # Refund if payment was held
            EscrowService.refund_to_wallet(appointment, reason=f"Status changed to {new_status}")

        # Create log
        AppointmentStatusLog.objects.create(
            appointment=appointment,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=changed_by,
            reason=reason,
            metadata=metadata or {}
        )

        # Trigger events/notifications
        AppointmentEvents.dispatch(appointment, f'appointment.{new_status}')

        return appointment

    @staticmethod
    def _validate_transition(old_status, new_status):
        """
        Simple state machine validation.
        """
        valid_transitions = {
            'pending': ['doctor_approved', 'rejected', 'cancelled'],
            'doctor_approved': ['confirmed', 'cancelled', 'rejected'],
            'confirmed': ['in_progress', 'cancelled', 'missed'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [], # Final state
            'cancelled': [], # Final state
            'rejected': [], # Final state
            'missed': [] # Final state
        }

        if new_status not in valid_transitions.get(old_status, []):
            raise ValueError(f"Invalid transition from {old_status} to {new_status}")

    @staticmethod
    def cancel_appointment(appointment, cancelled_by, reason):
        return AppointmentService.update_status(
            appointment, 
            'cancelled', 
            cancelled_by, 
            reason=reason,
            metadata={'cancelled_by_role': cancelled_by.role}
        )
