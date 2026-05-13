import requests
from .base import PaymentAdapter
from django.conf import settings

SSL_API_URL = getattr(settings, 'SSL_SANDBOX_URL', 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php')

class SSLCommerzAdapter(PaymentAdapter):
    def init_payment(self, payment, return_urls: dict, ipn_url: str) -> dict:
        """
        return_urls: dict with keys 'success', 'fail', 'cancel'
        ipn_url: webhook url that SSLCommerz will call
        """
        payload = {
            "store_id": settings.SSL_STORE_ID,
            "store_passwd": settings.SSL_STORE_PASSWORD,
            "total_amount": str(payment.amount),
            "currency": "BDT",
            "tran_id": str(payment.id),
            "success_url": return_urls.get('success'),
            "fail_url": return_urls.get('fail'),
            "cancel_url": return_urls.get('cancel'),
            "ipn_url": ipn_url,

            # customer fields
            "cus_name": payment.user.full_name or payment.user.email,
            "cus_email": payment.user.email,
            "cus_add1": "Dhaka, Bangladesh", # Placeholder as our model is thin
            "cus_city": "Dhaka",
            "cus_country": "Bangladesh",
            "cus_phone": "01700000000",

            # product metadata
            "shipping_method": "NO",
            "product_name": f"Consultation with Dr. {payment.appointment.doctor.full_name}",
            "product_category": "Healthcare",
            "product_profile": "non-physical-goods",
            "value_a": f"appt_id:{payment.appointment.id}"
        }

        # call SSLCommerz endpoint
        resp = requests.post(SSL_API_URL, data=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def verify_payload(self, request_data: dict) -> dict:
        """
        SSLCommerz will POST fields like: tran_id, status, val_id, etc.
        """
        tran_id = request_data.get('tran_id')
        status = request_data.get('status')
        val_id = request_data.get('val_id')
        return {
            "tran_id": tran_id,
            "status": status,
            "val_id": val_id,
            "raw": request_data
        }
