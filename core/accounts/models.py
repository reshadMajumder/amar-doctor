from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('admin', 'Admin'),
    )

    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')

    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # --- Suspension fields (Phase 7) ---
    is_suspended = models.BooleanField(default=False, db_index=True)
    suspension_reason = models.TextField(blank=True, null=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suspended_users',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.full_name

    @property
    def is_operationally_active(self):
        """Returns True only if user is active and not suspended."""
        return self.is_active and not self.is_suspended


class DoctorProfile(models.Model):
    VERIFICATION_STATUS_CHOICES = (
        ('pending', 'Pending Verification'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialization = models.CharField(max_length=255)
    bmdc_number = models.CharField(max_length=100)
    documents = models.FileField(upload_to='doctor_docs/', blank=True, null=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)

    # --- Verification fields (Phase 7) ---
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    verification_notes = models.TextField(blank=True, null=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_doctors',
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    is_available = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['verification_status', 'is_available']),
        ]

    def __str__(self):
        return f"Dr. {self.user.full_name} - {self.specialization} [{self.verification_status}]"

    @property
    def can_consult(self):
        """Only approved, non-suspended, active doctors can consult."""
        return (
            self.verification_status == 'approved'
            and self.is_available
            and self.user.is_active
            and not self.user.is_suspended
        )


class AdminProfile(models.Model):
    """
    Fine-grained operational role for admin users.
    Extends User (role='admin') with specific operational permissions.
    """
    ADMIN_ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('operations_admin', 'Operations Admin'),
        ('finance_admin', 'Finance Admin'),
        ('support_admin', 'Support Admin'),
        ('doctor_verification_admin', 'Doctor Verification Admin'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='admin_profile',
        limit_choices_to={'role': 'admin'}
    )
    admin_role = models.CharField(
        max_length=30,
        choices=ADMIN_ROLE_CHOICES,
        default='support_admin',
        db_index=True
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_admins',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} [{self.admin_role}]"

    @property
    def is_super_admin(self):
        return self.admin_role == 'super_admin'
