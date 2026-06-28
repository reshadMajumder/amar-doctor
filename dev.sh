#!/bin/bash
# Start all development services (postgres, redis, app, workers, and nginx)
docker compose -f docker-compose.dev.yml --profile app --profile worker up --build
