from django.db import transaction
from django.db.models import F
from decimal import Decimal
import uuid
from ..models import PatientWallet, DoctorWallet, PlatformWallet, WalletTransaction

class WalletService:
    @staticmethod
    @transaction.atomic
    def update_patient_balance(patient, amount, tx_type, direction, appointment=None, metadata=None):
        """
        Atomically updates patient wallet and creates a ledger entry.
        """
        wallet, created = PatientWallet.objects.select_for_update().get_or_create(patient=patient)
        previous_balance = wallet.available_balance
        
        if direction == 'credit':
            wallet.available_balance += amount
        else:
            if wallet.available_balance < amount:
                raise ValueError("Insufficient balance in patient wallet.")
            wallet.available_balance -= amount
            wallet.lifetime_spent += amount

        wallet.save()
        
        return WalletTransaction.objects.create(
            wallet_type='patient',
            patient_wallet=wallet,
            appointment=appointment,
            transaction_type=tx_type,
            direction=direction,
            amount=amount,
            previous_balance=previous_balance,
            new_balance=wallet.available_balance,
            reference=f"PAT-{uuid.uuid4().hex[:12].upper()}",
            metadata=metadata or {}
        )

    @staticmethod
    @transaction.atomic
    def update_doctor_balance(doctor, amount, tx_type, direction, appointment=None, metadata=None):
        """
        Atomically updates doctor wallet and creates a ledger entry.
        """
        wallet, created = DoctorWallet.objects.select_for_update().get_or_create(doctor=doctor)
        previous_balance = wallet.available_balance
        
        if direction == 'credit':
            wallet.available_balance += amount
            wallet.lifetime_earnings += amount
        else:
            if wallet.available_balance < amount:
                raise ValueError("Insufficient balance in doctor wallet.")
            wallet.available_balance -= amount

        wallet.save()
        
        return WalletTransaction.objects.create(
            wallet_type='doctor',
            doctor_wallet=wallet,
            appointment=appointment,
            transaction_type=tx_type,
            direction=direction,
            amount=amount,
            previous_balance=previous_balance,
            new_balance=wallet.available_balance,
            reference=f"DOC-{uuid.uuid4().hex[:12].upper()}",
            metadata=metadata or {}
        )

    @staticmethod
    @transaction.atomic
    def update_platform_balance(amount, tx_type, direction, appointment=None, metadata=None):
        """
        Atomically updates platform wallet and creates a ledger entry.
        """
        wallet = PlatformWallet.objects.select_for_update().get(pk=1)
        previous_balance = wallet.available_balance
        
        if direction == 'credit':
            wallet.available_balance += amount
            wallet.lifetime_revenue += amount
        else:
            wallet.available_balance -= amount

        wallet.save()
        
        return WalletTransaction.objects.create(
            wallet_type='platform',
            platform_wallet=wallet,
            appointment=appointment,
            transaction_type=tx_type,
            direction=direction,
            amount=amount,
            previous_balance=previous_balance,
            new_balance=wallet.available_balance,
            reference=f"PLT-{uuid.uuid4().hex[:12].upper()}",
            metadata=metadata or {}
        )

    @staticmethod
    @transaction.atomic
    def hold_for_escrow(appointment):
        """
        Logic for moving money into HELD state.
        For now, we just mark the appointment as 'paid_held' in the database.
        Financial movement happens during 'release' or 'refund'.
        """
        # Ensure wallets exist
        PatientWallet.objects.get_or_create(patient=appointment.patient)
        DoctorWallet.objects.get_or_create(doctor=appointment.doctor)
        PlatformWallet.get_instance()
        
        return True
