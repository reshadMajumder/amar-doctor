from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from accounts.models import DoctorProfile

def clear_doctor_caches():
    """
    Helper function to invalidate all doctor list and specialization caches.
    """
    # Invalidate all doctor list query caches
    if hasattr(cache, 'delete_pattern'):
        try:
            cache.delete_pattern("doctor_list:*")
        except Exception:
            cache.clear()
    else:
        cache.clear()
    
    # Invalidate doctor specializations cache
    cache.delete('doctor_specializations')

@receiver(post_save, sender=DoctorProfile)
def clear_doctor_cache_on_save(sender, instance, **kwargs):
    """
    Invalidate cache when a doctor profile is modified or created.
    """
    clear_doctor_caches()

@receiver(post_delete, sender=DoctorProfile)
def clear_doctor_cache_on_delete(sender, instance, **kwargs):
    """
    Invalidate cache when a doctor profile is deleted.
    """
    clear_doctor_caches()

@receiver(post_save, sender='accounts.User')
def clear_doctor_cache_on_user_save(sender, instance, **kwargs):
    """
    Invalidate cache when a doctor user profile is modified (e.g. name update or suspension status).
    """
    if instance.role == 'doctor':
        clear_doctor_caches()

@receiver(post_delete, sender='accounts.User')
def clear_doctor_cache_on_user_delete(sender, instance, **kwargs):
    """
    Invalidate cache when a doctor user profile is deleted.
    """
    if instance.role == 'doctor':
        clear_doctor_caches()

