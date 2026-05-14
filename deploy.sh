#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if .env file exists
if [ ! -f "core/.env" ]; then
    echo "Error: core/.env file not found"
    echo "Please create core/.env with required configuration"
    exit 1
fi

case "$COMMAND" in
  dev)
    echo "🚀 Starting development environment..."
    docker compose --env-file core/.env -f docker-compose.yml -f docker-compose.dev.yml up --build
    ;;
  prod)
    echo "🚀 Starting production environment..."
    docker compose --env-file core/.env up -d --build
    echo "✅ Services started in background"
    echo "View logs with: ./deploy.sh logs"
    ;;
  logs)
    docker compose --env-file core/.env logs -f
    ;;
  restart)
    echo "🔄 Restarting services..."
    docker compose --env-file core/.env restart
    ;;
  stop)
    echo "⏹️  Stopping services..."
    docker compose --env-file core/.env stop
    ;;
  down)
    echo "🛑 Shutting down and removing containers..."
    docker compose --env-file core/.env down --remove-orphans
    ;;
  build)
    echo "🔨 Building images..."
    docker compose --env-file core/.env build
    ;;
  status)
    echo "📊 Service Status:"
    docker compose --env-file core/.env ps
    ;;
  *)
    echo "Usage: ./deploy.sh {dev|prod|logs|restart|stop|down|build|status}"
    echo ""
    echo "Commands:"
    echo "  dev       - Start development environment with auto-reload"
    echo "  prod      - Start production environment in background"
    echo "  logs      - View service logs"
    echo "  restart   - Restart all services"
    echo "  stop      - Stop all services"
    echo "  down      - Shut down and remove containers"
    echo "  build     - Build container images"
    echo "  status    - Show service status"
    exit 1
    ;;
esac