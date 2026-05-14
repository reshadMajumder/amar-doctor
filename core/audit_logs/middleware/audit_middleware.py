class AuditContextMiddleware:
    """
    Middleware that attaches audit context (IP, user-agent) to the request object.
    Makes it easy to pass to AuditLogService without touching every view.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.audit_ip = self._get_client_ip(request)
        request.audit_user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]
        response = self.get_response(request)
        return response

    @staticmethod
    def _get_client_ip(request) -> str | None:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
