from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import CreatePaymentSerializer, PaymentDetailSerializer
from .models import Payment
from .services import get_adapter
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
        payment = Payment.objects.select_related('user', 'appointment').get(id=payment.id)

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
            payment.status = Payment.STATUS_FAILED
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
            payment.status = Payment.STATUS_FAILED
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

        try:
            payment = Payment.objects.select_related('appointment').get(id=tran_id)
        except Payment.DoesNotExist:
            return Response({"detail": "payment not found"}, status=404)

        if payment.status == Payment.STATUS_SUCCESS:
            return Response({"detail": "already processed"}, status=200)

        if status_received in ('VALID', 'SUCCESS'):
            payment.status = Payment.STATUS_SUCCESS
            payment.transaction_id = info.get('val_id') or data.get('tran_id') or ''
            payment.val_id = info.get('val_id')
            payment.save()

            # Update appointment payment status
            appointment = payment.appointment
            appointment.payment_status = 'paid_held' # Held in escrow until completion/release
            appointment.save()

            return Response({"detail": "payment confirmed"}, status=200)
        else:
            payment.status = Payment.STATUS_FAILED
            payment.save()
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
            queryset = Payment.objects.select_related('user', 'appointment').all()
        else:
            queryset = Payment.objects.select_related('user', 'appointment').filter(user=user)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        appointment_id = self.request.query_params.get('appointment_id')
        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)
            
        return queryset
