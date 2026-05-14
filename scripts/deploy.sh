#!/bin/bash
set -e

# Amardoctor Deployment Setup Script
# Automates initial setup for production deployment

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Amardoctor Production Setup Script${NC}"
echo "========================================"
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

if [ ! -f ".env.prod" ]; then
    echo -e "${YELLOW}⚠️  .env.prod not found${NC}"
    echo "Creating .env.prod from template..."
    cp .env.prod.template .env.prod
    echo -e "${RED}⚠️  IMPORTANT: Edit .env.prod with your production secrets!${NC}"
    echo "nano .env.prod"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Create directories
echo -e "${YELLOW}✓ Creating directories...${NC}"
mkdir -p ssl/certbot/conf ssl/www backups
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Verify SSL certificates
echo -e "${YELLOW}✓ Checking SSL certificates...${NC}"
if [ ! -f "ssl/certbot/conf/live/amardoc.reshad.dev/fullchain.pem" ]; then
    echo -e "${RED}⚠️  SSL certificates not found!${NC}"
    echo "You need to generate certificates first:"
    echo ""
    echo "docker run -it --rm \\"
    echo "  -v \$(pwd)/ssl/certbot/conf:/etc/letsencrypt \\"
    echo "  -v \$(pwd)/ssl/www:/var/www/certbot \\"
    echo "  certbot/certbot certonly --standalone \\"
    echo "  -d amardoc.reshad.dev \\"
    echo "  -d www.amardoc.reshad.dev \\"
    echo "  --agree-tos \\"
    echo "  --email your-email@example.com"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo -e "${GREEN}✓ SSL certificates found${NC}"
echo ""

# Start production services
echo -e "${YELLOW}✓ Starting production services...${NC}"
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services
echo -e "${YELLOW}✓ Waiting for services to start...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}✓ Checking health...${NC}"
docker compose -f docker-compose.prod.yml exec django python manage.py migrate --noinput

echo ""
echo -e "${GREEN}✓ Production deployment successful!${NC}"
echo ""
echo "Next steps:"
echo "1. Create superuser: docker compose -f docker-compose.prod.yml exec django python manage.py createsuperuser"
echo "2. Check health: curl https://amardoc.reshad.dev/health/"
echo "3. Monitor logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Access points:"
echo "  - API: https://amardoc.reshad.dev/api/"
echo "  - Admin: https://amardoc.reshad.dev/admin/"
echo "  - Status: https://amardoc.reshad.dev/health/"
echo ""
