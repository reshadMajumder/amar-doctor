from django.db import models
from django.conf import settings
from decimal import Decimal
from appointments.models import Appointment

class PatientWallet(models.Model):
    patient = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_wallet')
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    lifetime_spent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet: {self.patient.email} ({self.available_balance})"

class DoctorWallet(models.Model):
    doctor = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_wallet')
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    lifetime_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_platform_fees_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Doctor Wallet: {self.doctor.email} ({self.available_balance})"

class PlatformWallet(models.Model):
    """Single system-level wallet to track platform revenue."""
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    lifetime_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Platform Wallet: {self.available_balance}"

    @classmethod
    def get_instance(cls):
        instance, created = cls.objects.get_or_create(pk=1)
        return instance

class WalletTransaction(models.Model):
    WALLET_TYPE_CHOICES = (
        ('patient', 'Patient Wallet'),
        ('doctor', 'Doctor Wallet'),
        ('platform', 'Platform Wallet'),
    )

    TRANSACTION_TYPE_CHOICES = (
        ('consultation_payment_hold', 'Consultation Payment Hold'),
        ('consultation_release', 'Consultation Release'),
        ('consultation_refund', 'Consultation Refund'),
        ('platform_commission', 'Platform Commission'),
        ('withdrawal', 'Withdrawal'),
        ('deposit', 'Deposit'),
        ('adjustment', 'Adjustment'),
    )

    DIRECTION_CHOICES = (
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
    )

    wallet_type = models.CharField(max_length=20, choices=WALLET_TYPE_CHOICES)
    
    # Optional links to specific wallets
    patient_wallet = models.ForeignKey(PatientWallet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    doctor_wallet = models.ForeignKey(DoctorWallet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    platform_wallet = models.ForeignKey(PlatformWallet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
    
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE_CHOICES)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    previous_balance = models.DecimalField(max_digits=12, decimal_places=2)
    new_balance = models.DecimalField(max_digits=12, decimal_places=2)
    
    metadata = models.JSONField(default=dict, blank=True)
    reference = models.CharField(max_length=100, unique=True, db_index=True) # Unique ID for idempotency
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Tx {self.reference}: {self.direction} {self.amount} ({self.transaction_type})"
