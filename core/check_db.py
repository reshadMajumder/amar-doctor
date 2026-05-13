import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from triage.models import AITriageSession
from django.contrib.auth import get_user_model

User = get_user_model()
print("Sessions:", list(AITriageSession.objects.values('id', 'patient_id', 'status')))
print("Users:", list(User.objects.values('id', 'email', 'role')))
