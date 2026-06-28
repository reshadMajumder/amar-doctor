from django.urls import path
from .views import WalletMeView, WalletTransactionListView, WalletDepositView

urlpatterns = [
    path('me/', WalletMeView.as_view(), name='wallet-me'),
    path('transactions/', WalletTransactionListView.as_view(), name='wallet-transactions'),
    path('deposit/', WalletDepositView.as_view(), name='wallet-deposit'),
]
