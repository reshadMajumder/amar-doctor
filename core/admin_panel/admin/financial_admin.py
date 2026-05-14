from django.contrib import admin
from payments.models import PaymentTransaction, PlatformSettings
from wallets.models import PlatformWallet, WalletTransaction

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'appointment', 'amount', 'status', 'created_at')
    list_filter = ('status', 'gateway_provider', 'created_at')
    search_fields = ('user__email', 'transaction_id', 'appointment__booking_reference')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(PlatformWallet)
class PlatformWalletAdmin(admin.ModelAdmin):
    list_display = ('id', 'available_balance', 'lifetime_revenue', 'updated_at')
    readonly_fields = ('available_balance', 'lifetime_revenue', 'updated_at')

    def has_add_permission(self, request):
        return not PlatformWallet.objects.exists()

@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'consultation_commission_percentage', 'updated_at')

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('reference', 'wallet_type', 'transaction_type', 'amount', 'direction', 'status', 'created_at')
    list_filter = ('wallet_type', 'transaction_type', 'direction', 'status')
    search_fields = ('reference', 'metadata')
    readonly_fields = ('created_at',)
