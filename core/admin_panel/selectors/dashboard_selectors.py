from django.contrib.auth import get_user_model

User = get_user_model()


def get_all_users(role=None, is_suspended=None, is_active=None, search=None):
    qs = User.objects.order_by('-created_at')
    if role:
        qs = qs.filter(role=role)
    if is_suspended is not None:
        qs = qs.filter(is_suspended=is_suspended)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if search:
        qs = qs.filter(
            email__icontains=search
        ) | qs.filter(full_name__icontains=search)
    return qs.distinct()
