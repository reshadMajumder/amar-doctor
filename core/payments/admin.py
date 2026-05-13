from django.contrib import admin

# Register your models here.

from .models import PaymentTransaction, PlatformSettings

admin.site.register(PaymentTransaction)
admin.site.register(PlatformSettings)