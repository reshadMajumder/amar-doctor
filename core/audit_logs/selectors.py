from audit_logs.models import AuditLog


def get_audit_logs(
    actor_id=None,
    action_type=None,
    target_model=None,
    target_id=None,
    date_from=None,
    date_to=None,
):
    """
    Returns a filterable AuditLog queryset.
    All parameters are optional — pass only what you need to filter by.
    """
    qs = AuditLog.objects.select_related('actor').order_by('-created_at')

    if actor_id:
        qs = qs.filter(actor_id=actor_id)
    if action_type:
        qs = qs.filter(action_type=action_type)
    if target_model:
        qs = qs.filter(target_model=target_model)
    if target_id:
        qs = qs.filter(target_id=target_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    return qs
