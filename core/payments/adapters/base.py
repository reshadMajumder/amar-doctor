from abc import ABC, abstractmethod

class PaymentAdapter(ABC):
    @abstractmethod
    def init_payment(self, payment, return_urls: dict, ipn_url: str) -> dict:
        """
        Initialize payment on provider.
        Return provider response dict (must include redirect/payment url).
        """
        raise NotImplementedError

    @abstractmethod
    def verify_payload(self, request_data: dict) -> dict:
        """
        Optional: verify payment payload (provider-specific).
        Return a normalized dict with keys like:
            { "tran_id": ..., "status": "VALID"/"FAILED", "val_id": ..., ... }
        """
        raise NotImplementedError
