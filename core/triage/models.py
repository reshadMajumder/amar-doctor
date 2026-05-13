from django.db import models
from django.conf import settings

class AITriageSession(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('ai_processing', 'AI Processing'),
        ('waiting_for_patient', 'Waiting for Patient'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    RISK_LEVEL_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('emergency', 'Emergency'),
    )

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='triage_sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    language = models.CharField(max_length=10, default='en')
    current_step = models.IntegerField(default=1)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES, default='low')
    emergency_detected = models.BooleanField(default=False)
    ai_provider = models.CharField(max_length=50, default='gemini')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session {self.id} - {self.patient.email} ({self.status})"

class AITriageMessage(models.Model):
    SENDER_CHOICES = (
        ('patient', 'Patient'),
        ('ai', 'AI'),
        ('system', 'System'),
    )
    
    MESSAGE_TYPE_CHOICES = (
        ('symptom', 'Symptom'),
        ('follow_up_question', 'Follow Up Question'),
        ('answer', 'Answer'),
        ('warning', 'Warning'),
        ('summary', 'Summary'),
        ('status_update', 'Status Update'),
    )

    session = models.ForeignKey(AITriageSession, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=10, choices=SENDER_CHOICES)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender_type} ({self.message_type}) - {self.session.id}"

class AIReport(models.Model):
    session = models.OneToOneField(AITriageSession, on_delete=models.CASCADE, related_name='report')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_reports')
    extracted_symptoms = models.JSONField()
    symptom_duration = models.CharField(max_length=255)
    severity_level = models.CharField(max_length=50)
    follow_up_answers = models.JSONField()
    emergency_flags = models.JSONField(default=list, blank=True)
    ai_summary = models.TextField()
    risk_category = models.CharField(max_length=50)
    recommended_specialization = models.CharField(max_length=255)
    triage_score = models.FloatField(null=True, blank=True)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for Session {self.session.id}"
