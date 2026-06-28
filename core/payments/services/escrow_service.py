from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from ..models import PaymentTransaction, PlatformSettings
from wallets.services.wallet_service import WalletService

class EscrowService:
    @staticmethod
    @transaction.atomic
    def hold_payment(appointment, transaction_id, val_id, metadata=None):
        """
        Marks payment as held in escrow.
        This is called after a successful gateway response.
        """
        payment_tx, created = PaymentTransaction.objects.get_or_create(
            appointment=appointment,
            defaults={
                'user': appointment.patient,
                'amount': appointment.consultation_fee,
                'gateway_provider': 'sslcommerz',
                'transaction_id': transaction_id,
                'val_id': val_id,
                'status': PaymentTransaction.STATUS_PAID_HELD,
                'held_at': timezone.now(),
                'metadata': metadata or {}
            }
        )
        
        if not created:
            payment_tx.status = PaymentTransaction.STATUS_PAID_HELD
            payment_tx.held_at = timezone.now()
            payment_tx.transaction_id = transaction_id
            payment_tx.val_id = val_id
            payment_tx.save()

        # Update appointment payment status
        appointment.payment_status = 'paid_held'
        appointment.save()

        # Initialize wallets if they don't exist
        WalletService.hold_for_escrow(appointment)

        # Trigger DB notifications for booking request
        from notifications.services.notification_service import NotificationService
        try:
            NotificationService.create_notification(
                recipient=appointment.patient,
                n_type='booking',
                title='Appointment Booked',
                message=f"Your appointment with Dr. {appointment.doctor.full_name} has been booked. Fee of ৳{appointment.consultation_fee} is held in escrow."
            )
            NotificationService.create_notification(
                recipient=appointment.doctor,
                n_type='booking',
                title='New Appointment Request',
                message=f"Patient {appointment.patient.full_name} has requested an appointment."
            )
        except Exception as e:
            print("Error creating gateway booking notifications:", e)
        
        return payment_tx

    @staticmethod
    @transaction.atomic
    def release_payment(appointment):
        """
        Releases money from escrow to doctor and platform.
        Called when appointment is COMPLETED.
        """
        try:
            payment_tx = PaymentTransaction.objects.select_for_update().get(
                appointment=appointment, 
                status=PaymentTransaction.STATUS_PAID_HELD
            )
        except PaymentTransaction.DoesNotExist:
            raise ValueError("No held payment found for this appointment.")

        commission_rate = PlatformSettings.get_commission_rate()
        total_amount = payment_tx.amount
        
        platform_fee = (total_amount * commission_rate).quantize(Decimal('0.01'))
        doctor_amount = total_amount - platform_fee

        # 1. Credit Doctor
        WalletService.update_doctor_balance(
            doctor=appointment.doctor,
            amount=doctor_amount,
            tx_type='consultation_release',
            direction='credit',
            appointment=appointment,
            metadata={'total_fee': str(total_amount), 'platform_fee': str(platform_fee)}
        )

        # 2. Credit Platform
        WalletService.update_platform_balance(
            amount=platform_fee,
            tx_type='platform_commission',
            direction='credit',
            appointment=appointment,
            metadata={'total_fee': str(total_amount), 'doctor_id': str(appointment.doctor.id)}
        )

        # 3. Update Payment Transaction
        payment_tx.status = PaymentTransaction.STATUS_RELEASED
        payment_tx.released_at = timezone.now()
        payment_tx.save()

        # Notify Doctor
        from notifications.services.notification_service import NotificationService
        try:
            NotificationService.create_notification(
                recipient=appointment.doctor,
                n_type='payment',
                title='Consultation Fee Released',
                message=f"Consultation fee of ৳{doctor_amount} has been released to your wallet for appointment with {appointment.patient.full_name}."
            )
        except Exception as e:
            print("Error creating release payment notification:", e)

        appointment.payment_status = 'released'
        appointment.save()

        return payment_tx

    @staticmethod
    @transaction.atomic
    def refund_to_wallet(appointment, reason="Doctor cancelled"):
        """
        Refunds the held payment to the patient's wallet.
        Called when a PAID appointment is CANCELLED or REJECTED.
        """
        try:
            payment_tx = PaymentTransaction.objects.select_for_update().get(
                appointment=appointment, 
                status=PaymentTransaction.STATUS_PAID_HELD
            )
        except PaymentTransaction.DoesNotExist:
            # If no payment was held, nothing to refund
            return None

        # Credit Patient Wallet
        WalletService.update_patient_balance(
            patient=appointment.patient,
            amount=payment_tx.amount,
            tx_type='consultation_refund',
            direction='credit',
            appointment=appointment,
            metadata={'reason': reason}
        )

        # Decrement Doctor's pending balance
        from wallets.models import DoctorWallet
        try:
            commission_rate = PlatformSettings.get_commission_rate()
            total_amount = payment_tx.amount
            platform_fee = (total_amount * commission_rate).quantize(Decimal('0.01'))
            doctor_amount = total_amount - platform_fee

            doctor_wallet = DoctorWallet.objects.select_for_update().get(doctor=appointment.doctor)
            doctor_wallet.pending_balance = max(Decimal('0.00'), doctor_wallet.pending_balance - doctor_amount)
            doctor_wallet.save()
        except DoctorWallet.DoesNotExist:
            pass

        # Update Payment Transaction
        payment_tx.status = PaymentTransaction.STATUS_REFUNDED
        payment_tx.refunded_at = timezone.now()
        payment_tx.metadata['refund_reason'] = reason
        payment_tx.save()

        # Notify Patient
        from notifications.services.notification_service import NotificationService
        try:
            NotificationService.create_notification(
                recipient=appointment.patient,
                n_type='payment',
                title='Refund Credited',
                message=f"Refund of ৳{payment_tx.amount} has been credited to your wallet for the cancelled appointment with Dr. {appointment.doctor.full_name}."
            )
        except Exception as e:
            print("Error creating refund payment notification:", e)

        appointment.payment_status = 'refunded'
        appointment.save()

        return payment_tx
