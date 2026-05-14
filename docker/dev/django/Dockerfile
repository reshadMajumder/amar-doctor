# Development Dockerfile - Hot Reload Enabled
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt /tmp/

# Install Python dependencies
RUN pip install -r /tmp/requirements.txt

# Copy project (source code will be mounted as volume for hot reload)
COPY core/manage.py .
COPY core/conftest.py .
COPY core/pytest.ini .

# Create staticfiles and media directories
RUN mkdir -p /app/staticfiles /app/media

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python manage.py shell -c "from django.db import connection; connection.ensure_connection()" || exit 1

# Copy entrypoint script
COPY scripts/entrypoint.dev.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
