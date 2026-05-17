import random
from datetime import time
from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker
from accounts.models import User, DoctorProfile
from appointments.models import DoctorAvailability

class Command(BaseCommand):
    help = 'Seeds verified doctor profiles with Faker and sets up booking availability'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Number of doctor profiles to create'
        )

    def handle(self, *args, **options):
        count = options['count']
        fake = Faker()
        
        specializations = ['General Physician', 'Pediatrics', 'Cardiology', 'Gynecology', 'Neurology', 'Ophthalmology', 'Dermatology', 'Orthopedics', 'ENT', 'Urology', 'Endocrinology', 'Nephrology', 'Hepatology', 'Rheumatology', 'Infectious Diseases', 'Pulmonology', 'Gastroenterology', 'Hematology', 'Oncology', 'Psychiatry']
        
        self.stdout.write(self.style.WARNING('Wiping existing doctor users, profiles, and availabilities...'))
        with transaction.atomic():
            # Deleting User cascade deletes DoctorProfile and DoctorAvailability
            deleted_users = User.objects.filter(role='doctor').delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted existing doctor objects: {deleted_users}'))

        self.stdout.write(self.style.NOTICE(f'Seeding {count} doctors with active schedules...'))
        
        created_count = 0
        with transaction.atomic():
            for _ in range(count):
                email = fake.unique.email().lower()
                name = f"Dr. {fake.name()}"
                
                # Check duplicate
                if User.objects.filter(email=email).exists():
                    continue
                
                # 1. Create User
                user = User.objects.create_user(
                    email=email,
                    password='password123',
                    full_name=name,
                    role='doctor',
                    is_verified=True
                )
                
                # 2. Create Doctor Profile
                spec = random.choice(specializations)
                bmdc = f"BMDC-{fake.unique.random_number(digits=6, fix_len=True)}"
                fee = random.choice([300.00, 400.00, 500.00, 600.00, 800.00])
                
                DoctorProfile.objects.create(
                    user=user,
                    specialization=spec,
                    bmdc_number=bmdc,
                    consultation_fee=fee,
                    verification_status='approved',
                    is_available=True
                )

                # 3. Create Daily Availability Slots (0=Monday to 6=Sunday)
                for day in range(7):
                    DoctorAvailability.objects.create(
                        doctor=user,
                        weekday=day,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        break_start_time=time(13, 0),
                        break_end_time=time(14, 0),
                        slot_duration_minutes=30,
                        max_appointments_per_slot=1,
                        timezone='UTC',
                        is_active=True
                    )
                
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created Doctor: {name} ({spec}) - {email} with full active availability'))

        # Clear the cached specializations so the AI instantly picks up new specialties!
        from django.core.cache import cache
        cache.delete('doctor_specializations')

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} doctor profiles with booking availabilities!'))
