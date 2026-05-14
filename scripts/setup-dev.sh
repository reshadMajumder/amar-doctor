#!/bin/bash

# Quick setup script for development environment
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🐳 Amardoctor Development Setup${NC}"
echo "=================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}✓ Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Create .env.dev if not exists
if [ ! -f ".env.dev" ]; then
    echo -e "${YELLOW}⚠️  .env.dev not found, creating...${NC}"
    cat > .env.dev << 'EOF'
# Development environment
SECRET_KEY=django-insecure-dev-key
DEBUG=True
DB_NAME=amardoctor
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
ALLOWED_HOSTS=localhost,127.0.0.1,django,nginx
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
PUBLIC_DOMAIN=http://localhost:8000
ENVIRONMENT=dev
EOF
    echo -e "${GREEN}✓ .env.dev created${NC}"
fi

# Create directories
mkdir -p staticfiles media

# Start services
echo -e "${YELLOW}✓ Starting development services...${NC}"
docker compose -f docker-compose.dev.yml up --build -d

# Wait for services
echo -e "${YELLOW}✓ Waiting for services to start...${NC}"
sleep 15

# Run migrations
echo -e "${YELLOW}✓ Running migrations...${NC}"
docker compose -f docker-compose.dev.yml exec -T django python manage.py migrate

echo ""
echo -e "${GREEN}✓ Development setup complete!${NC}"
echo ""
echo "Access points:"
echo "  - API: http://localhost/api/"
echo "  - Admin: http://localhost/admin/"
echo "  - WebSocket: ws://localhost/ws/"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "  - Django shell: docker compose -f docker-compose.dev.yml exec django python manage.py shell"
echo "  - Create superuser: docker compose -f docker-compose.dev.yml exec django python manage.py createsuperuser"
echo "  - Run tests: docker compose -f docker-compose.dev.yml exec django pytest"
echo ""
echo "To stop: docker compose -f docker-compose.dev.yml down"
echo ""
