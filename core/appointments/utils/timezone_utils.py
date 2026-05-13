from zoneinfo import ZoneInfo
from datetime import datetime, time, timedelta
from django.utils import timezone

def convert_to_utc(dt, tz_name):
    """Convert a naive datetime or local datetime to UTC."""
    if timezone.is_naive(dt):
        local_tz = ZoneInfo(tz_name)
        dt = dt.replace(tzinfo=local_tz)
    return dt.astimezone(ZoneInfo("UTC"))

def get_today_in_timezone(tz_name):
    """Get today's date in a specific timezone."""
    tz = ZoneInfo(tz_name)
    return datetime.now(tz).date()

def combine_date_time_to_utc(date_obj, time_obj, tz_name):
    """Combine date and time objects into a UTC datetime."""
    local_tz = ZoneInfo(tz_name)
    local_dt = datetime.combine(date_obj, time_obj, tzinfo=local_tz)
    return local_dt.astimezone(ZoneInfo("UTC"))
