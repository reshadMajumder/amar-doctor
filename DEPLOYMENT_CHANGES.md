# Deployment Configuration - Backend Only Update

## Summary
This document outlines the changes made to convert the Amardoctor project from a full-stack (frontend + admin + backend) to a backend-only API deployment with Celery task queue and WebSocket support.

## Changes Made

### 1. Docker Compose Files

#### Removed Services
- ✅ `frontend` service (Next.js patient app on port 3000)
- ✅ `admin` service (Next.js admin panel on port 3001)

#### Retained Services
- ✅ `db` - PostgreSQL 17 database
- ✅ `redis` - Redis cache and Celery message broker
- ✅ `core` - Django ASGI backend with WebSocket support (port 8000)
- ✅ `celery_worker` - Async task processor
- ✅ `celery_beat` - Scheduled task scheduler
- ✅ `nginx` - Reverse proxy with SSL/TLS support

#### Updated Configuration
- **docker-compose.yml**: Production configuration
  - Removed frontend/admin build contexts
  - Updated `core` ALLOWED_HOSTS: `api.amardoctor.com,amardoctor.com,localhost,127.0.0.1`
  - Updated CORS_ALLOWED_ORIGINS: `https://amardoctor.com` (client domain only)
  - Simplified nginx dependencies to only `core`
  
- **docker-compose.dev.yml**: Development configuration
  - Removed frontend/admin services
  - Updated CORS_ALLOWED_ORIGINS: `http://localhost,http://127.0.0.1,https://*.ngrok-free.app,https://*.ngrok.io`
  - Simplified nginx dependencies to only `core`

### 2. Nginx Configuration

#### Production (nginx/nginx.conf)
- Removed frontend server block
- Removed admin server block
- Consolidated to single server block handling all API requests
- All routes now proxy directly to Django backend
- Maintained WebSocket support with proper Upgrade headers
- SSL/TLS termination on port 443

#### Development (nginx/nginx.dev.conf)
- Removed frontend location block
- Removed admin location block
- Single root location proxies all traffic to Django
- Maintains WebSocket support for development
- HTTP only (port 80)

### 3. README.md Documentation

#### Updated Sections
- Architecture Overview: Clarified backend-only API architecture
- Development Deployment: Updated service URLs to API only
- Production Deployment: Simplified for API-only deployment
- Domain Configuration: Updated to `amardoctor.com` and `api.amardoctor.com`
- Service URLs: Updated for API endpoints only
- Added Celery Task Queue management section
- Added Celery troubleshooting in the Troubleshooting section

### 4. Environment Configuration

#### Updated CORS Settings
**Production (docker-compose.yml)**
```
CORS_ALLOWED_ORIGINS: https://amardoctor.com
CSRF_TRUSTED_ORIGINS: https://amardoctor.com,https://api.amardoctor.com
```

**Development (docker-compose.dev.yml)**
```
CORS_ALLOWED_ORIGINS: http://localhost,http://127.0.0.1,https://*.ngrok-free.app,https://*.ngrok.io
CSRF_TRUSTED_ORIGINS: http://localhost,http://127.0.0.1,https://*.ngrok-free.app,https://*.ngrok.io
```

## Architecture

### Services Diagram
```
Client Application
    ↓
Nginx (Reverse Proxy)
    ↓
Django ASGI Backend (port 8000)
    ├─ HTTP API endpoints
    ├─ WebSocket connections (Django Channels)
    └─ Static files
    ↓
PostgreSQL (Database)
Redis (Cache & Message Broker)
    ↓
Celery Worker (Background Tasks)
Celery Beat (Scheduled Tasks)
```

## Deployment Workflow

### Development
```bash
./deploy.sh dev
# Starts: db, redis, core, celery_worker, celery_beat, nginx
# API accessible at: http://localhost:8000
# Nginx proxy at: http://localhost:80
```

### Production
```bash
./deploy.sh prod
# Starts: db, redis, core, celery_worker, celery_beat, nginx
# API accessible at: https://amardoctor.com
# Nginx with SSL on ports: 80 (redirect) and 443
```

## Key Features Preserved

✅ **WebSocket Support**
- Django Channels with Daphne ASGI server
- Secure WebSocket (WSS) in production
- Proper Nginx Upgrade headers for persistent connections

✅ **Asynchronous Processing**
- Celery worker for background tasks
- Celery beat for scheduled tasks
- Redis as message broker with persistence

✅ **Production Ready**
- Health checks for all services
- Automatic restart on failure
- Connection pooling and optimization
- SSL/TLS termination

✅ **Development Features**
- Hot reload with Django development server
- ngrok tunnel support for webhooks
- Debug logging enabled

## Domain Configuration

**Update these domains in your configuration:**

In `docker-compose.yml`:
- Change `amardoctor.com` to your actual domain

In `nginx/nginx.conf`:
- Update `server_name` directives with your domain

In `core/.env`:
- Update `ALLOWED_HOSTS` with your domain
- Update `CORS_ALLOWED_ORIGINS` with your client domain

## Next Steps

1. ✅ Configure `core/.env` with your database and Redis settings
2. ✅ Update domain names in docker-compose.yml and nginx.conf
3. ✅ Place SSL certificates in `ssl/` directory
4. ✅ Run `./deploy.sh dev` for development or `./deploy.sh prod` for production

## Client Integration

Frontend/mobile applications should connect to:
- **API Endpoint**: `https://amardoctor.com/api/` or `https://api.amardoctor.com/`
- **WebSocket Endpoint**: `wss://amardoctor.com/ws/` (for Django Channels)

## Notes

- All references to frontend and admin applications have been removed
- Network name is `amardoctor_net` (updated from previous `adurys_net`)
- Database and file backups scripts remain unchanged
- Nginx configuration is optimized for backend API with WebSocket support
- Redis is configured with persistence (RDB + AOF) for production
