from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import CreatePaymentSerializer, PaymentDetailSerializer
from .models import PaymentTransaction
from .services import get_adapter
from .services.escrow_service import EscrowService
from appointments.models import Appointment

class CreatePaymentView(generics.CreateAPIView):
    """
    Create payment record and initialize provider (SSLCommerz).
    Request body: { "appointment_id": <id> }
    """
    serializer_class = CreatePaymentSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({"detail": "Validation failed", "errors": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        
        payment = serializer.save()
        # Refetch with select_related 
        payment = PaymentTransaction.objects.select_related('user', 'appointment').get(id=payment.id)

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
            return Response({"detail": "Failed to initialize payment", "error": str(e)},
                            status=status.HTTP_502_BAD_GATEWAY)

        if res.get('status') == 'SUCCESS' and res.get('GatewayPageURL'):
            return Response({
                "payment_id": payment.id,
                "amount": str(payment.amount),
                "payment_url": res.get('GatewayPageURL')
            })
        else:
            payment.status = PaymentTransaction.STATUS_FAILED
            payment.save()
            return Response({"detail": "Payment initialization failed", "provider_response": res}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data or request.POST.dict()
        adapter = get_adapter('sslcommerz')
        info = adapter.verify_payload(data)
        tran_id = info.get('tran_id')
        status_received = (info.get('status') or '').upper()

        if not tran_id:
            return Response({"detail": "tran_id missing"}, status=400)

        # In a real system, tran_id would be our PaymentTransaction ID
        # For simulation, we might receive it as an integer or UUID string
        try:
            payment_tx = PaymentTransaction.objects.select_related('appointment').get(id=tran_id)
        except (PaymentTransaction.DoesNotExist, ValueError):
            return Response({"detail": "payment transaction not found"}, status=404)

        if payment_tx.status == PaymentTransaction.STATUS_PAID_HELD:
            return Response({"detail": "already processed"}, status=200)

        if status_received in ('VALID', 'SUCCESS'):
            # Use EscrowService to handle the logic
            EscrowService.hold_payment(
                appointment=payment_tx.appointment,
                transaction_id=data.get('tran_id'), # Gateway transaction ID
                val_id=info.get('val_id'),
                metadata=data
            )
            return Response({"detail": "payment confirmed and held in escrow"}, status=200)
        else:
            payment_tx.status = PaymentTransaction.STATUS_FAILED
            payment_tx.save()
            return Response({"detail": "payment failed"}, status=200)

class PaymentSuccessView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        return Response({"detail": "payment successful"}, status=200)

class PaymentFailView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        return Response({"detail": "payment failed"}, status=200)

class PaymentCancelView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        return Response({"detail": "payment canceled"}, status=200)

class PaymentsListView(generics.ListAPIView):
    serializer_class = PaymentDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            queryset = PaymentTransaction.objects.select_related('user', 'appointment').all()
        else:
            queryset = PaymentTransaction.objects.select_related('user', 'appointment').filter(user=user)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        appointment_id = self.request.query_params.get('appointment_id')
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
            
        return queryset
