# ============================================================================
# Build Stage - Install dependencies
# ============================================================================
FROM python:3.12-slim as builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Runtime Stage - Production image
# ============================================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/app/.venv/bin:$PATH

WORKDIR /app

# Install runtime dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . /app/

# Create necessary directories and app user
RUN mkdir -p /app/staticfiles /app/media && \
    useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Collect static files (but only if DJANGO_SETTINGS_MODULE is set)
RUN mkdir -p /app/staticfiles && \
    chown -R appuser:appuser /app/staticfiles

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Default command - run Daphne ASGI server
# Can be overridden in docker-compose for workers
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "--application-close-timeout", "60", "core.asgi:application"]
