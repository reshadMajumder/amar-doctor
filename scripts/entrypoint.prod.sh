#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_PORT=${PORT:-8000}
cd /app

# Ensure staticfiles and media directories exist with correct permissions
mkdir -p /app/staticfiles /app/media

echo -e "${YELLOW}[PROD] Waiting for postgres...${NC}"
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo -e "${GREEN}[PROD] Postgres started${NC}"

echo -e "${YELLOW}[PROD] Running migrations...${NC}"
python manage.py migrate --noinput

echo -e "${YELLOW}[PROD] Collecting static files...${NC}"
python manage.py collectstatic --noinput --clear

echo -e "${YELLOW}[PROD] Starting Uvicorn ASGI server...${NC}"
python -m uvicorn core.asgi:application \
    --host 0.0.0.0 \
    --port $APP_PORT \
    --workers 4 \
    --env-file .env
