from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PatientWallet, DoctorWallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer

class WalletMeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer

    def get_object(self):
        user = self.request.user
        if user.role == 'doctor':
            wallet, _ = DoctorWallet.objects.get_or_create(doctor=user)
        else:
            wallet, _ = PatientWallet.objects.get_or_create(patient=user)
        return wallet

class WalletTransactionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletTransactionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return WalletTransaction.objects.filter(doctor_wallet__doctor=user)
        return WalletTransaction.objects.filter(patient_wallet__patient=user)
