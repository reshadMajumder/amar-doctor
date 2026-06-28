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

        payment_method = request.data.get('payment_method', 'direct')

        if payment_method == 'wallet':
            appointment_id = serializer.validated_data['appointment_id']
            user = request.user
            
            appointment = Appointment.objects.get(id=appointment_id, patient=user)
            
            # Check wallet balance
            from wallets.models import PatientWallet
            wallet, _ = PatientWallet.objects.get_or_create(patient=user)
            
            if wallet.available_balance < appointment.consultation_fee:
                return Response({"detail": "Insufficient wallet balance."}, status=status.HTTP_400_BAD_REQUEST)
                
            from django.db import transaction
            from django.utils import timezone
            import uuid
            from wallets.services.wallet_service import WalletService
            
            try:
                with transaction.atomic():
                    # Debit patient wallet
                    WalletService.update_patient_balance(
                        patient=user,
                        amount=appointment.consultation_fee,
                        tx_type='consultation_payment_hold',
                        direction='debit',
                        appointment=appointment
                    )
                    
                    # Create PaymentTransaction in STATUS_PAID_HELD state
                    payment = PaymentTransaction.objects.create(
                        user=user,
                        appointment=appointment,
                        amount=appointment.consultation_fee,
                        status=PaymentTransaction.STATUS_PAID_HELD,
                        gateway_provider='wallet',
                        transaction_id=f"WAL-{uuid.uuid4().hex[:12].upper()}",
                        held_at=timezone.now()
                    )
                    
                    # Update appointment payment status
                    appointment.payment_status = 'paid_held'
                    appointment.save()
                    
                    # Initialize escrow wallets
                    WalletService.hold_for_escrow(appointment)

                    # Trigger DB notifications for booking request
                    from notifications.services.notification_service import NotificationService
                    try:
                        NotificationService.create_notification(
                            recipient=user,
                            n_type='booking',
                            title='Appointment Booked (Wallet)',
                            message=f"Your appointment with Dr. {appointment.doctor.full_name} has been booked using your wallet balance. Fee of ৳{appointment.consultation_fee} is held in escrow."
                        )
                        NotificationService.create_notification(
                            recipient=appointment.doctor,
                            n_type='booking',
                            title='New Appointment Request',
                            message=f"Patient {user.full_name} has requested an appointment."
                        )
                    except Exception as e:
                        print("Error creating wallet booking notifications:", e)
            except Exception as e:
                return Response({"detail": f"Wallet transaction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            return Response({
                "payment_id": payment.id,
                "amount": str(payment.amount),
                "status": payment.status,
                "payment_method": "wallet"
            }, status=status.HTTP_200_OK)

        # Direct payment (SSLCommerz)
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
                            status=status.HTTP_520_BAD_GATEWAY)

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
            if payment_tx.appointment:
                # Use EscrowService to handle the logic
                EscrowService.hold_payment(
                    appointment=payment_tx.appointment,
                    transaction_id=data.get('tran_id'), # Gateway transaction ID
                    val_id=info.get('val_id'),
                    metadata=data
                )
                return Response({"detail": "payment confirmed and held in escrow"}, status=200)
            else:
                # Direct wallet deposit!
                from wallets.services.wallet_service import WalletService
                WalletService.update_patient_balance(
                    patient=payment_tx.user,
                    amount=payment_tx.amount,
                    tx_type='deposit',
                    direction='credit',
                    metadata=data
                )
                payment_tx.status = PaymentTransaction.STATUS_RELEASED
                payment_tx.transaction_id = data.get('tran_id')
                payment_tx.val_id = info.get('val_id')
                payment_tx.save()

                # Send payment notification
                from notifications.services.notification_service import NotificationService
                try:
                    NotificationService.create_notification(
                        recipient=payment_tx.user,
                        n_type='payment',
                        title='Wallet Deposit Successful',
                        message=f"৳{payment_tx.amount} has been successfully credited to your wallet available balance."
                    )
                except Exception as e:
                    print("Error creating deposit webhook notification:", e)

                return Response({"detail": "wallet deposit successful"}, status=200)
        else:
            payment_tx.status = PaymentTransaction.STATUS_FAILED
            payment_tx.save()
            return Response({"detail": "payment failed"}, status=200)

from django.http import HttpResponseRedirect

@method_decorator(csrf_exempt, name='dispatch')
class PaymentSuccessView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return HttpResponseRedirect("http://localhost:9002/wallet")

    def post(self, request, *args, **kwargs):
        data = request.data or request.POST.dict()
        adapter = get_adapter('sslcommerz')
        info = adapter.verify_payload(data)
        tran_id = info.get('tran_id')
        status_received = (info.get('status') or '').upper()

        if tran_id:
            try:
                payment_tx = PaymentTransaction.objects.select_related('appointment').get(id=tran_id)
                
                # Check if it has not been processed yet (e.g. by Webhook/IPN)
                if payment_tx.status not in (PaymentTransaction.STATUS_PAID_HELD, PaymentTransaction.STATUS_RELEASED):
                    if status_received in ('VALID', 'SUCCESS'):
                        if payment_tx.appointment:
                            EscrowService.hold_payment(
                                appointment=payment_tx.appointment,
                                transaction_id=data.get('tran_id'),
                                val_id=info.get('val_id'),
                                metadata=data
                            )
                        else:
                            # Direct wallet deposit!
                            from wallets.services.wallet_service import WalletService
                            WalletService.update_patient_balance(
                                patient=payment_tx.user,
                                amount=payment_tx.amount,
                                tx_type='deposit',
                                direction='credit',
                                metadata=data
                            )
                            payment_tx.status = PaymentTransaction.STATUS_RELEASED
                            payment_tx.transaction_id = data.get('tran_id')
                            payment_tx.val_id = info.get('val_id')
                            payment_tx.save()

                            # Send payment notification
                            from notifications.services.notification_service import NotificationService
                            try:
                                NotificationService.create_notification(
                                    recipient=payment_tx.user,
                                    n_type='payment',
                                    title='Wallet Deposit Successful',
                                    message=f"৳{payment_tx.amount} has been successfully credited to your wallet available balance."
                                )
                            except Exception as e:
                                print("Error creating deposit success redirect notification:", e)
            except Exception as e:
                print("Error processing payment success redirect:", e)

        return HttpResponseRedirect("http://localhost:9002/wallet")

@method_decorator(csrf_exempt, name='dispatch')
class PaymentFailView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        return HttpResponseRedirect("http://localhost:9002/wallet")
    def post(self, request, *args, **kwargs):
        return HttpResponseRedirect("http://localhost:9002/wallet")

@method_decorator(csrf_exempt, name='dispatch')
class PaymentCancelView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        return HttpResponseRedirect("http://localhost:9002/wallet")
    def post(self, request, *args, **kwargs):
        return HttpResponseRedirect("http://localhost:9002/wallet")

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
