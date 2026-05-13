#!/bin/bash

# Default to dev if no argument provided
ENV=${1:-dev}

if [ "$ENV" == "prod" ]; then
    echo "Deploying to PRODUCTION..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
elif [ "$ENV" == "dev" ]; then
    echo "Starting DEVELOPMENT environment..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
else
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi
