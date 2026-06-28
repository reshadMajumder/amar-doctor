#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
ENV_FILE=".env"
CORE_ENV_FILE="core/.env"
CORE_ENV_EXAMPLE="core/.env.example"
SSL_DIR="./ssl"
CERT_FILE="${SSL_DIR}/cert.pem"
KEY_FILE="${SSL_DIR}/key.pem"

# Help message
show_help() {
    echo "Amar Doctor Deployment & Development Runner"
    echo "Usage: ./run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev      Start development environment (hot-reloads code, Daphne + Nginx proxy)"
    echo "  prod     Start production environment (Next.js client + ASGI app + workers + Nginx)"
    echo "  stop     Stop all running environments (both dev and prod)"
    echo "  logs     View live container logs"
    echo "  status   Show status of containers"
    echo ""
}

# Sync environment variables
sync_env() {
    echo "--> Syncing environment files..."
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$CORE_ENV_FILE" ]; then
            echo "Copying $CORE_ENV_FILE to root $ENV_FILE"
            cp "$CORE_ENV_FILE" "$ENV_FILE"
        elif [ -f "$CORE_ENV_EXAMPLE" ]; then
            echo "Creating root $ENV_FILE from template"
            cp "$CORE_ENV_EXAMPLE" "$ENV_FILE"
        else
            echo "Error: No environment configuration file template found!"
            exit 1
        fi
    fi
    # Always keep core/.env in sync with root .env
    cp "$ENV_FILE" "$CORE_ENV_FILE"
    echo "Environment files synchronized."
}

# Ensure SSL certificates for Nginx in production
ensure_ssl() {
    echo "--> Checking SSL Certificates..."
    mkdir -p "$SSL_DIR"
    if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
        echo "No production SSL certificates found at ${CERT_FILE} / ${KEY_FILE}."
        echo "Generating temporary self-signed certificates for Cloudflare SSL integration..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -subj "/CN=localhost" \
            2>/dev/null
        echo "Temporary SSL certificates generated at ${SSL_DIR}/"
    else
        echo "Using existing SSL certificates from ${SSL_DIR}/"
    fi
}

# Main routing
case "$1" in
    dev)
        sync_env
        echo "--> Starting development services..."
        docker compose -f docker-compose.dev.yml --profile app --profile worker up --build
        ;;
    prod)
        sync_env
        ensure_ssl
        echo "--> Starting production services in background..."
        docker compose -f docker-compose.prod.yml up --build -d
        echo "Production stack is running."
        echo "Use './run.sh logs' to monitor container output."
        ;;
    stop)
        echo "--> Stopping all services..."
        docker compose -f docker-compose.dev.yml --profile app --profile worker down --remove-orphans || true
        docker compose -f docker-compose.prod.yml down --remove-orphans || true
        echo "All services stopped."
        ;;
    logs)
        if [ -f "docker-compose.prod.yml" ]; then
            echo "--> Tailing production logs (press Ctrl+C to exit)..."
            docker compose -f docker-compose.prod.yml logs -f
        fi
        ;;
    status)
        echo "--> Development container status:"
        docker compose -f docker-compose.dev.yml --profile app --profile worker ps
        echo ""
        echo "--> Production container status:"
        docker compose -f docker-compose.prod.yml ps
        ;;
    *)
        show_help
        exit 1
        ;;
esac
