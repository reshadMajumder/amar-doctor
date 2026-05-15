# AmarDoctor - Production Deployment Infrastructure

Production-ready Docker deployment for Django Channels-based AI-assisted telemedicine platform with PostgreSQL 17, Redis, Nginx, and Celery.

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│         Cloudflare SSL (Full Strict)             │
├──────────────────────────────────────────────────┤
│    Nginx Reverse Proxy (WebSocket + Static)      │
├──────────────────────────────────────────────────┤
│  Django  │  Celery  │  Celery  │ PostgreSQL │    │
│  ASGI    │  Worker  │   Beat   │ Database   │    │
│  (4 WKR) │          │ Scheduler│            │    │
├──────────────────────────────────────────────────┤
│  Redis Cache & Channels Layer                    │
└──────────────────────────────────────────────────┘
```

**Stack**:
- Django 6.0 + Channels 4 (ASGI)
- PostgreSQL 17
- Redis 7
- Celery with Beat Scheduler
- Nginx with SSL/TLS
- Gunicorn + Uvicorn Workers

---

## Quick Start - Development

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum
- Port 80, 443 available for Nginx

### 1. Setup Environment

```bash
cd amardoctor/
```

Create `core/.env`:

```bash
ENVIRONMENT=dev
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True

# Database
DB_NAME=amardoctor
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CACHE_DB=1
REDIS_CELERY_DB=0

# Email & APIs
GEMINI_API_KEY=your-api-key
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@amardoctor.com

# Payments
SSL_STORE_ID=your-store-id
SSL_STORE_PASSWORD=your-password

# Domain
PUBLIC_DOMAIN=http://localhost:8000
```

### 2. Start Services

```bash
# Main services (app, postgres, redis, nginx)
docker compose -f docker-compose.dev.yml up --build

# In another terminal, start workers
docker compose -f docker-compose.dev.yml --profile worker up -d
```

### 3. Access Application

- **API**: http://localhost
- **Admin**: http://localhost/admin
- **WebSocket**: ws://localhost/ws/

### 4. Initialize Database

```bash
docker compose -f docker-compose.dev.yml exec app python manage.py migrate
docker compose -f docker-compose.dev.yml exec app python manage.py createsuperuser
```

---

## Production Deployment

### Prerequisites
- Docker & Docker Compose on production server
- Cloudflare SSL Origin Certificate
- Strong database password
- Django SECRET_KEY (generate: `python -c "import secrets; print(secrets.token_urlsafe(50))"`)

### 1. Prepare SSL Certificates

#### Get Cloudflare Origin Certificate

1. Cloudflare Dashboard → SSL/TLS → Origin Server
2. Create Origin Certificate
3. Download certificate and private key
4. Place in `ssl/` directory:

```bash
mkdir -p ssl/
# cert.pem - origin certificate
# key.pem  - private key
```

**⚠️ CRITICAL**: Never commit SSL files. Already in `.gitignore`.

### 2. Create Production Environment

Create `core/.env`:

```bash
ENVIRONMENT=prod
SECRET_KEY=<generate-strong-key>
DEBUG=False

# Database
DB_NAME=amardoctor_prod
DB_USER=amardoctor
DB_PASSWORD=<strong-password>
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CACHE_DB=1
REDIS_CELERY_DB=0

# Security
ALLOWED_HOSTS=amardoc.reshad.dev
CSRF_TRUSTED_ORIGINS=https://amardoc.reshad.dev
CORS_ALLOWED_ORIGINS=https://amardoc.reshad.dev

# Services
GEMINI_API_KEY=<your-key>
EMAIL_HOST_USER=<prod-email>
EMAIL_HOST_PASSWORD=<app-password>
DEFAULT_FROM_EMAIL=noreply@amardoctor.com
SSL_STORE_ID=<store-id>
SSL_STORE_PASSWORD=<store-password>

# Domain
PUBLIC_DOMAIN=https://amardoc.reshad.dev
```

### 3. Deploy

```bash
# Start all services in background
docker compose -f docker-compose.prod.yml up --build -d

# Verify health
docker compose -f docker-compose.prod.yml ps
```

Expected status: All services **Up** and **healthy**

### 4. Post-Deployment Setup

```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec app python manage.py migrate

# Create superuser
docker compose -f docker-compose.prod.yml exec app python manage.py createsuperuser

# Collect static files (auto-runs but can run manually)
docker compose -f docker-compose.prod.yml exec app python manage.py collectstatic --noinput
```

### 5. Configure Cloudflare

1. **SSL/TLS Mode**: Full (Strict)
2. **DNS**: Point A record to server IP
3. **Edge Certificates**: Auto-renew enabled

### 6. Verify Production

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Tail logs
docker compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl https://amardoc.reshad.dev/health/
```

---

## Project Structure

```
amardoctor/
├── core/                       # Django Project
│   ├── core/
│   │   ├── settings.py        # Django config
│   │   ├── asgi.py            # ASGI with Channels
│   │   ├── celery.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/              # Authentication
│   ├── appointments/          # Appointments
│   ├── chat/                  # Real-time chat
│   ├── triage/                # AI Triage
│   ├── notifications/         # Notifications
│   ├── payments/              # Payment Processing
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── .env                   # Config (git-ignored)
│
├── nginx/
│   ├── dev/nginx.conf         # Development config
│   └── prod/nginx.conf        # Production config
│
├── ssl/
│   ├── cert.pem               # SSL certificate (git-ignored)
│   └── key.pem                # SSL key (git-ignored)
│
├── docker-compose.dev.yml     # Development
├── docker-compose.prod.yml    # Production
├── .dockerignore
├── .gitignore
└── README.md
```

---

## Service Management

### Development

```bash
# Start all (app, postgres, redis, nginx)
docker compose -f docker-compose.dev.yml up --build

# Start workers separately
docker compose -f docker-compose.dev.yml --profile worker up -d

# Stop all
docker compose -f docker-compose.dev.yml down

# Remove volumes (⚠️ deletes data)
docker compose -f docker-compose.dev.yml down -v
```

### Production

```bash
# Deploy
docker compose -f docker-compose.prod.yml up --build -d

# Status
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Restart service
docker compose -f docker-compose.prod.yml restart app

# Stop all (keeps data)
docker compose -f docker-compose.prod.yml down
```

---

## Celery Tasks

### Monitor

```bash
# View active tasks
docker compose -f docker-compose.dev.yml exec celery celery -A core inspect active

# Watch real-time
docker compose -f docker-compose.dev.yml exec celery celery -A core events

# List scheduled tasks
docker compose -f docker-compose.dev.yml exec celery-beat celery -A core inspect scheduled
```

---

## WebSocket Support

The infrastructure is fully WebSocket-compatible:

- **CRITICAL Nginx Headers** (already configured):
  ```
  Upgrade: websocket
  Connection: upgrade
  ```

- **Django Channels Configuration** (in `core/asgi.py`):
  - JWT authentication middleware
  - Redis channel layer
  - Multiple routing URL patterns

- **Access**:
  - Development: `ws://localhost/ws/`
  - Production: `wss://amardoc.reshad.dev/ws/`

---

## Database Backups

### Create Backup

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U amardoctor -d amardoctor_prod > backup.sql
```

### Restore from Backup

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql \
  -U amardoctor -d amardoctor_prod < backup.sql
```

---

## Troubleshooting

### WebSocket Not Working

```bash
# Check Nginx headers
docker compose logs nginx

# Verify Channels config
cat core/core/asgi.py

# Test endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://amardoc.reshad.dev/ws/
```

### Database Connection Error

```bash
# Check PostgreSQL
docker compose -f docker-compose.dev.yml ps postgres
docker compose -f docker-compose.dev.yml logs postgres

# Reset (dev only)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build
```

### Static Files Missing

```bash
# Collect manually
docker compose -f docker-compose.dev.yml exec app \
  python manage.py collectstatic --noinput

# Verify mount
docker compose -f docker-compose.dev.yml exec nginx \
  ls -la /app/staticfiles/
```

### Celery Not Processing

```bash
# Check Redis
docker compose -f docker-compose.dev.yml ps redis
docker compose -f docker-compose.dev.yml logs redis

# Check worker
docker compose -f docker-compose.dev.yml --profile worker logs celery

# Inspect tasks
docker compose -f docker-compose.dev.yml exec celery \
  celery -A core inspect active
```

---

## Performance Tuning

### Nginx
- Gzip compression enabled
- HTTP/2 support
- Connection pooling
- Asset caching (365 days for `/static/`)
- Rate limiting (API: 30 req/s, WebSocket: 100 req/s)

### Django
- 4 Gunicorn workers (production)
- Uvicorn async workers
- Redis caching layer
- Connection pooling

### Database
- Named persistent volumes
- Health checks
- Connection limits

### Docker
- Multi-stage builds (optimize layer caching)
- Alpine-based images (slim)
- Non-root user execution

---

## Scaling for Production

1. **Multiple App Instances**: Add more `app` services in `docker-compose.prod.yml`
2. **Load Balancing**: Nginx already configured with `upstream` blocks
3. **Database**: Migrate to managed PostgreSQL (AWS RDS, DigitalOcean)
4. **Redis**: Use managed Redis (AWS ElastiCache, DigitalOcean)
5. **Static Files**: Use CDN (Cloudflare, CloudFront, S3)
6. **Celery Workers**: Run on separate machines with shared Redis broker

---

## Environment Variables

### Required (Development)
```
DEBUG=True
SECRET_KEY=<dev-key>
DB_PASSWORD=postgres
```

### Required (Production)
```
DEBUG=False
SECRET_KEY=<strong-key>
DB_PASSWORD=<strong-password>
ALLOWED_HOSTS=amardoc.reshad.dev
CSRF_TRUSTED_ORIGINS=https://amardoc.reshad.dev
```

### Optional
```
GEMINI_API_KEY
EMAIL_HOST_USER
EMAIL_HOST_PASSWORD
SSL_STORE_ID
SSL_STORE_PASSWORD
```

---

## Security Features

### Nginx
- SSL/TLS termination
- HSTS headers
- Security headers (XSS, CSP, etc.)
- Rate limiting
- Hidden `.files`

### Django
- Secure cookies
- CSRF protection
- CORS whitelist
- Allowed hosts validation
- SQL injection prevention (ORM)

### Database
- Persistent volumes
- Health checks
- Strong passwords required
- No default credentials

---

## Health Checks

All services have health checks enabled:

```bash
# View status
docker compose -f docker-compose.prod.yml ps

# Expected: "Up" and "healthy"
```

### Endpoints
- Django: GET `/health/`
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

---

## Logs

### View All Logs
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### View Specific Service
```bash
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml logs -f celery
docker compose -f docker-compose.dev.yml logs -f postgres
```

---

## Updates & Dependencies

### Update Python Packages
```bash
pip install -r core/requirements.txt -U
pip freeze > core/requirements.txt
docker compose -f docker-compose.dev.yml up --build
```

---

## Notes

- **SSL**: Place Cloudflare certificates in `ssl/` folder
- **Environment**: Use `.env` file (git-ignored) for secrets
- **WebSocket**: CRITICAL nginx headers already configured
- **Static Files**: Auto-collected on startup
- **Health**: All services have checks enabled
- **Restart**: Always `restart: always` in production
- **Volumes**: Named volumes for data persistence

---

## Support

For issues:
1. Check logs: `docker compose logs [service]`
2. Verify health: `docker compose ps`
3. Check `.env` configuration
4. Test connectivity between services

---

**Last Updated**: May 2026  
**Version**: 1.0.0 (Production Ready)
