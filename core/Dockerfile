# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libffi-dev \
    libssl-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Create necessary directories and set permissions
RUN mkdir -p /app/staticfiles /app/media && \
    useradd -m appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port 8000
EXPOSE 8000

# Default command to run Daphne (ASGI server)
# This can be overridden in docker-compose for celery workers
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
