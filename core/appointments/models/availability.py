from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class DoctorAvailability(models.Model):
    WEEKDAY_CHOICES = (
        (0, _('Monday')),
        (1, _('Tuesday')),
        (2, _('Wednesday')),
        (3, _('Thursday')),
        (4, _('Friday')),
        (5, _('Saturday')),
        (6, _('Sunday')),
    )

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='availabilities',
        limit_choices_to={'role': 'doctor'}
    )
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration_minutes = models.PositiveIntegerField(default=30)
    
    break_start_time = models.TimeField(null=True, blank=True)
    break_end_time = models.TimeField(null=True, blank=True)
    
    max_appointments_per_slot = models.PositiveIntegerField(default=1)
    timezone = models.CharField(max_length=50, default='UTC')
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Doctor Availabilities"
        ordering = ['weekday', 'start_time']

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError(_("End time must be after start time."))
        
        if self.break_start_time and self.break_end_time:
            if self.break_start_time >= self.break_end_time:
                raise ValidationError(_("Break end time must be after break start time."))
            if not (self.start_time <= self.break_start_time < self.end_time):
                raise ValidationError(_("Break must be within availability period."))
            if not (self.start_time < self.break_end_time <= self.end_time):
                raise ValidationError(_("Break must be within availability period."))

    def __str__(self):
        return f"{self.doctor.full_name} - {self.get_weekday_display()} ({self.start_time}-{self.end_time})"

class DoctorBlockedSlot(models.Model):
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_slots',
        limit_choices_to={'role': 'doctor'}
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.start_datetime >= self.end_datetime:
            raise ValidationError(_("End datetime must be after start datetime."))

    def __str__(self):
        return f"Blocked: {self.doctor.full_name} ({self.start_datetime} to {self.end_datetime})"
