from payments.models import PaymentTransaction
from wallets.models import WalletTransaction


def get_all_transactions(status=None, date_from=None, date_to=None):
    qs = PaymentTransaction.objects.select_related('user', 'appointment').order_by('-created_at')
    if status:
        qs = qs.filter(status=status)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)
    return qs


def get_wallet_transactions(wallet_type=None, transaction_type=None, date_from=None, date_to=None):
    qs = WalletTransaction.objects.order_by('-created_at')
    if wallet_type:
        qs = qs.filter(wallet_type=wallet_type)
    if transaction_type:
        qs = qs.filter(transaction_type=transaction_type)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)
    return qs
