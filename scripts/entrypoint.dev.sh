#!/bin/bash
set -e

# Color output for clarity
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_PORT=${PORT:-8000}
cd /app

echo -e "${YELLOW}Waiting for postgres...${NC}"
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo -e "${GREEN}Postgres started${NC}"

echo -e "${YELLOW}Running migrations...${NC}"
python manage.py migrate --noinput

echo -e "${YELLOW}Starting development server with hot reload...${NC}"
python -m uvicorn core.asgi:application \
    --host 0.0.0.0 \
    --port $APP_PORT \
    --reload \
    --reload-includes="*.py" \
    --env-file .env
