#!/bin/bash

# Default to dev if no argument provided
ENV=${1:-dev}

# Check for sudo requirement
SUDO=""
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
fi

if [ "$ENV" == "prod" ]; then
    echo "Deploying to PRODUCTION..."
    $SUDO docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
elif [ "$ENV" == "dev" ]; then
    echo "Starting DEVELOPMENT environment..."
    $SUDO docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
else
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi
