from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PatientWallet, DoctorWallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer

from rest_framework.views import APIView

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

class WalletDepositView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount_str = request.data.get('amount')
        if not amount_str:
            return Response({"error": "amount is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from decimal import Decimal
            amount = Decimal(str(amount_str))
            if amount <= 0:
                raise ValueError()
        except ValueError:
            return Response({"error": "amount must be a positive number"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a PaymentTransaction without an appointment
        from payments.models import PaymentTransaction
        from payments.services import get_adapter
        from django.conf import settings

        payment = PaymentTransaction.objects.create(
            user=request.user,
            appointment=None,  # Nullable for direct deposit
            amount=amount,
            status=PaymentTransaction.STATUS_INITIATED,
            gateway_provider='sslcommerz'
        )

        adapter = get_adapter('sslcommerz')
        domain = getattr(settings, 'PUBLIC_DOMAIN', 'http://127.0.0.1:8000')
        return_urls = {
            'success': f"{domain}/api/v1/payments/success/",
            'fail': f"{domain}/api/v1/payments/fail/",
            'cancel': f"{domain}/api/v1/payments/cancel/"
        }
        ipn_url = f"{domain}/api/v1/payments/webhook/"

        try:
            res = adapter.init_payment(payment, return_urls=return_urls, ipn_url=ipn_url)
        except Exception as e:
            payment.status = PaymentTransaction.STATUS_FAILED
            payment.save()
            return Response({"error": "Failed to initialize payment gateway", "details": str(e)},
                            status=status.HTTP_502_BAD_GATEWAY)

        if res.get('status') == 'SUCCESS' and res.get('GatewayPageURL'):
            return Response({
                "payment_id": payment.id,
                "amount": str(payment.amount),
                "payment_url": res.get('GatewayPageURL')
            }, status=status.HTTP_200_OK)
        else:
            payment.status = PaymentTransaction.STATUS_FAILED
            payment.save()
            return Response({"error": "Payment initialization failed", "details": res}, status=status.HTTP_400_BAD_REQUEST)
