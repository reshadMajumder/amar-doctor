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
DEFAULT_AI_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
GROQ_API_KEY=your-groq-api-key
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@amardoctor.com

# Alternatively, to use Resend API (recommended if SMTP is blocked):
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=your-resend-api-key


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
- Docker & Docker Compose on the production server (VPS)
- Cloudflare SSL Origin Certificate (or any valid SSL certificate)
- Strong database password
- Django SECRET_KEY (generate: `python -c "import secrets; print(secrets.token_urlsafe(50))"`)

### 1. Prepare SSL Certificates

#### Get Cloudflare SSL Certificates

1. Log in to the Cloudflare Dashboard → select your domain → **SSL/TLS** → **Origin Server**.
2. Click **Create Certificate**.
3. Keep the default settings (private key type RSA, certificates list matching your domain) and click **Create**.
4. Copy the certificate content and save it as **`cert.pem`** in the `ssl/` folder at the project root.
5. Copy the private key content and save it as **`key.pem`** in the `ssl/` folder at the project root.
6. Make sure the directory looks like this:
   ```bash
   ssl/
   ├── cert.pem  # Certificate
   └── key.pem   # Private key
   ```

> [!IMPORTANT]
> **Never commit SSL certificates or private keys to git.** They are already added to `.gitignore`.

### 2. Create Production Environment

For production, the main configuration file is `.env` located at the **root** folder (referenced by `docker compose`). Do NOT use `core/.env` for production, as root level environment variables are passed to all container services.

Create `.env` at the project root:

```bash
ENVIRONMENT=prod
SECRET_KEY=<generate-strong-key>
DEBUG=False

# Database
DB_NAME=amardoctor_prod
DB_USER=amardoctor
DB_PASSWORD=<strong-password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CACHE_DB=1
REDIS_CELERY_DB=0

# Security
ALLOWED_HOSTS=amardoc.reshad.dev
CSRF_TRUSTED_ORIGINS=https://amardoc.reshad.dev
CORS_ALLOWED_ORIGINS=https://amardoc.reshad.dev

# Services & Email Providers
DEFAULT_AI_PROVIDER=groq
GEMINI_API_KEY=<your-key>
GROQ_API_KEY=<your-groq-key>

# SMTP Configuration (Standard email, note that VPS providers like DigitalOcean block outbound SMTP port 25)
EMAIL_PROVIDER=smtp
EMAIL_HOST_USER=<prod-email>
EMAIL_HOST_PASSWORD=<app-password>
DEFAULT_FROM_EMAIL=noreply@amardoctor.com

# Resend.com Configuration (Recommended fallback if SMTP is blocked)
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=<your-resend-api-key>
# DEFAULT_FROM_EMAIL=noreply@yourdomain.com

SSL_STORE_ID=<store-id>
SSL_STORE_PASSWORD=<store-password>

# Domain
PUBLIC_DOMAIN=https://amardoc.reshad.dev
```

### 3. Deploy

Deploy the production services using docker compose:

```bash
# Start all services in the background and build images if not already built
docker compose -f docker-compose.prod.yml up --build -d

# Verify containers are running
docker compose -f docker-compose.prod.yml ps
```

Expected status: All services should be **Up** and show as **healthy** (or starting up).

### 4. Post-Deployment Setup

Run the migrations and create the django administrator account:

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec app python manage.py migrate

# Create admin user
docker compose -f docker-compose.prod.yml exec app python manage.py createsuperuser

# (Optional) Verify static files collection
docker compose -f docker-compose.prod.yml exec app python manage.py collectstatic --noinput
```

### 5. Configure Cloudflare DNS & SSL

1. **DNS**: Point an A record for `amardoc.reshad.dev` to your server's public IP address.
2. **SSL/TLS Mode**: Set SSL/TLS encryption mode to **Full (strict)**.
3. Ensure HTTPS is enforced on Cloudflare.

### 6. Verify Production & Logs

Test the SSL endpoints using `curl` from a terminal or access the domain in your browser:

```bash
# Verify django backend health endpoint (returns 200 OK with database connection status)
curl -i https://amardoc.reshad.dev/health/

# Verify frontend index
curl -i https://amardoc.reshad.dev/
```

#### Viewing Container Logs
To monitor Nginx or Django errors, use `docker compose logs` or `docker logs`:

```bash
# View Nginx access and error logs
docker compose -f docker-compose.prod.yml logs nginx

# View Django application logs
docker compose -f docker-compose.prod.yml logs app
```

> [!WARNING]
> Do NOT use `docker exec [container] cat /var/log/nginx/error.log`. In Docker, Nginx logs are symlinked directly to the container's standard output (`/dev/stdout`) and standard error (`/dev/stderr`) streams. Running `cat` on these special devices inside the container will block/hang indefinitely. Use `docker compose logs nginx` instead.

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
