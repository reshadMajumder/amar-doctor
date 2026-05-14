# Amardoctor Infrastructure Architecture

## 📋 Overview

This document describes the production-ready infrastructure architecture for the Amardoctor platform.

### Architecture Stack

```
Internet
  ↓
Nginx (Port 80/443)
  ├─ Reverse Proxy
  ├─ SSL Termination (Let's Encrypt)
  ├─ Static File Serving
  ├─ WebSocket Proxying
  ↓
Django ASGI (Uvicorn on Port 8000)
  ├─ REST API
  ├─ WebSocket Endpoints
  ├─ User Authentication
  ├─ Business Logic
  ↓
PostgreSQL 17 (Port 5432)
  └─ Persistent Data Storage
  
Redis (Port 6379)
  ├─ Channels Layer (WebSockets)
  ├─ Celery Broker
  └─ Cache Backend

Celery Worker
  └─ Async Tasks

Celery Beat
  └─ Scheduled Tasks
```

---

## 📁 Directory Structure

### Root Level
```
amardoctor/
├── core/                    # Django project (apps, settings, urls)
│   ├── manage.py
│   ├── conftest.py          # Pytest configuration
│   ├── pytest.ini           # Pytest settings
│   ├── db.sqlite3           # Development database (git-ignored)
│   ├── settings/            # Environment-specific settings
│   ├── asgi.py              # ASGI application
│   └── [apps]/              # Django applications
│
├── requirements/            # Split requirement files
│   ├── base.txt            # Core dependencies
│   ├── dev.txt             # Development-only packages
│   └── prod.txt            # Production-only packages
│
├── docker/                 # Dockerfiles
│   ├── dev/                # Development Dockerfile
│   │   └── django/
│   │       └── Dockerfile  # Development image
│   └── prod/               # Production Dockerfile
│       └── django/
│           └── Dockerfile  # Optimized production image
│
├── scripts/                # Entrypoint & utility scripts
│   ├── entrypoint.dev.sh   # Dev: migrations + uvicorn reload
│   ├── entrypoint.prod.sh  # Prod: migrations + collectstatic + uvicorn
│   ├── wait_for_db.sh      # Database readiness check
│   ├── setup-dev.sh        # Initial development setup
│   └── deploy.sh           # Production deployment setup
│
├── nginx/                  # Nginx configuration
│   ├── dev/                # Development config (no SSL)
│   │   └── default.conf
│   └── prod/               # Production config (SSL)
│       └── default.conf
│
├── ssl/                    # SSL Certificates (git-ignored)
│   ├── certbot/            # Certbot configuration
│   │   └── conf/           # Let's Encrypt certificates
│   ├── www/                # ACME challenge directory
│   └── .gitignore          # Never commit certificates
│
├── staticfiles/            # Collected static files (git-ignored)
├── media/                  # User-uploaded files (git-ignored)
│
├── docker-compose.dev.yml  # Development orchestration
├── docker-compose.prod.yml # Production orchestration
├── docker-compose.yml      # Deprecated (see DEPLOYMENT.md)
│
├── .env.dev               # Development environment variables
├── .env.prod.template     # Production template (git-committed)
├── .env.prod              # Production secrets (git-ignored)
├── .gitignore             # Git exclusions
│
├── Makefile               # Convenience commands
├── DEPLOYMENT.md          # Deployment guide
├── INFRASTRUCTURE.md      # This file
└── README.md              # Project overview
```

---

## 🐳 Container Architecture

### Development Environment (docker-compose.dev.yml)

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Development Stack                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │  Django      │  ← Hot reload (uvicorn --reload)       │
│  │  (Port 8000) │     Mounted source code (/core)         │
│  │  Uvicorn     │     Two-way volume sync                 │
│  └──────────────┘                                          │
│        ↕                                                   │
│  ┌──────────────┐                                          │
│  │ PostgreSQL   │  ← postgres_data_dev volume            │
│  │ (Port 5432)  │     Auto health check                   │
│  └──────────────┘                                          │
│        ↕                                                   │
│  ┌──────────────┐                                          │
│  │    Redis     │  ← redis_data_dev volume               │
│  │ (Port 6379)  │     Channels + Celery                   │
│  └──────────────┘                                          │
│        ↕                                                   │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │    Celery    │     │ Celery Beat  │  ← Async tasks   │
│  │   Worker     │     │ (Scheduler)  │     Scheduled     │
│  └──────────────┘     └──────────────┘     tasks        │
│                                                            │
│  ┌──────────────────────────────────────┐                │
│  │            Nginx                     │  ← Reverse    │
│  │ (Port 80, WebSocket proxy)           │    proxy      │
│  │ Serves static/media + proxies ws:// │                │
│  └──────────────────────────────────────┘                │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment (docker-compose.prod.yml)

```
┌───────────────────────────────────────────────────────────────┐
│                  Docker Production Stack                      │
├───────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────┐               │
│  │  Nginx (Ports 80/443)                   │               │
│  │  ├─ SSL Termination                    │  ← Let's      │
│  │  ├─ Static File Serving                │     Encrypt   │
│  │  ├─ WebSocket Proxy (ws:// ↔ http://)│     (Auto     │
│  │  └─ Load Balancing                     │     Renewal) │
│  └──────────────────────┬──────────────────┘               │
│                         ↓                                   │
│  ┌──────────────────────────────────────┐                 │
│  │  Django ASGI (Uvicorn)               │  ← 4 workers  │
│  │  ├─ REST API endpoints               │                │
│  │  ├─ WebSocket consumers              │                │
│  │  └─ Business logic                   │                │
│  └──────────────┬───────────────────────┘                 │
│                 ↓                                          │
│  ┌────────────────────────────────────┐                   │
│  │  PostgreSQL 17 (Persistent Volume) │                   │
│  │  ├─ User data                      │                   │
│  │  ├─ Appointments                   │                   │
│  │  ├─ Chat history                   │                   │
│  │  └─ Audit logs                     │                   │
│  └────────────────────────────────────┘                   │
│                                                            │
│  ┌──────────────┐    ┌────────────────┐                   │
│  │    Redis     │    │   Certbot      │  ← SSL Renewal  │
│  │  (Channels   │    │  (every 12h)   │     (automated) │
│  │   + Celery   │    └────────────────┘                   │
│  │   + Cache)   │                                         │
│  └──────────────┘                                         │
│        ↓                                                  │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │    Celery    │     │ Celery Beat  │                    │
│  │   Worker     │     │ (Scheduler)  │  ← Long-running  │
│  │ (4 workers)  │     │              │     background   │
│  └──────────────┘     └──────────────┘     tasks        │
│                                                            │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 Service Dependencies

### Startup Order
1. **PostgreSQL** - Database must be ready first
2. **Redis** - Cache/broker must be accessible
3. **Django** - Application server
4. **Celery** - Depends on Redis and Django
5. **Celery Beat** - Depends on Celery
6. **Nginx** - Reverse proxy (can start after Django)
7. **Certbot** - SSL renewal loop (production only)

### Health Checks
All services have health checks configured:
```bash
docker compose ps  # View health status
```

Expected: `healthy` ✓ for all services

---

## 🌐 Network Architecture

### Docker Network
All services connected via `amardoctor_network` bridge network.

### Service Discovery (Docker DNS)
- `db:5432` - PostgreSQL
- `redis:6379` - Redis
- `django:8000` - Django ASGI server
- `nginx:80/443` - Nginx

### Port Mapping

| Service | Container | Host (Dev) | Host (Prod) |
|---------|-----------|-----------|------------|
| Django | 8000 | 8000 | N/A (nginx) |
| PostgreSQL | 5432 | 5432 | N/A (internal) |
| Redis | 6379 | 6379 | N/A (internal) |
| Nginx | 80/443 | 80 | 80/443 |

---

## 📊 Data Persistence

### Named Volumes (Preserved across restarts)
```yaml
# Development
postgres_data_dev:  /var/lib/postgresql/data
redis_data_dev:     /data

# Production
postgres_data_prod: /var/lib/postgresql/data
redis_data_prod:    /data
```

### Bind Mounts (Direct filesystem access)
```yaml
# Development (hot reload)
./core:/app/core                    # Source code
./staticfiles:/app/staticfiles      # Static files
./media:/app/media                  # User uploads

# Production (read-only)
./staticfiles:/app/staticfiles:ro   # Static files
./media:/app/media:ro               # User uploads
./ssl/certbot/conf:/etc/letsencrypt # Certificates
```

### Data Backup Strategy

**PostgreSQL Backups**:
```bash
# Daily backup at 2 AM
docker compose exec db pg_dump -U postgres -d amardoctor_prod > backup.sql

# Restore from backup
cat backup.sql | docker compose exec -T db psql -U postgres -d amardoctor_prod
```

**Static/Media Files**:
- Backed up via normal file system backups
- Stored in persistent Docker volumes

---

## 🔐 Security Architecture

### Network Security
- All services on private Docker network
- Only Nginx exposed to internet
- No direct database access from outside

### SSL/TLS
```
Internet (Port 443)
    ↓
Nginx (SSL Termination)
    ↓ (Plain HTTP, internal network)
Django (Port 8000)
```

### Environment Variables
- Development: `.env.dev` (less sensitive)
- Production: `.env.prod` (never committed to git)
- Template: `.env.prod.template` (for documentation)

### Secret Management
```bash
# Production secrets (NEVER commit)
.env.prod          # ❌ In .gitignore

# Templates (OK to commit)
.env.prod.template # ✓ For reference

# Development (OK to commit)
.env.dev           # ✓ Contains dummy values
```

### User Isolation
Production container runs as non-root user (`appuser`):
```dockerfile
RUN useradd -m -u 1000 appuser
USER appuser
```

---

## 🚀 Deployment Process

### Development Deployment
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Features**:
- ✅ Hot reload on code changes
- ✅ Full debug output
- ✅ Direct service access (ports exposed)
- ❌ Not optimized for performance
- ❌ DEBUG=True (reveals error details)

### Production Deployment
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Features**:
- ✅ Optimized Docker images
- ✅ Multi-worker ASGI server
- ✅ SSL encryption
- ✅ Automated certificate renewal
- ✅ Gzip compression
- ✅ Security headers
- ✅ Production logging

---

## 📈 Scalability

### Horizontal Scaling (Future)

**Additional Celery Workers**:
```bash
docker compose -f docker-compose.prod.yml up -d --scale celery=3
```

**Additional Django ASGI Workers**:
- Currently: 4 workers per container
- Edit `entrypoint.prod.sh` to adjust worker count

**Database Replication** (Future):
- Currently: Single PostgreSQL instance
- Add read replicas for scaling

**Redis Clustering** (Future):
- Currently: Single Redis instance
- Add Redis Sentinel for HA

**CDN/Static Files** (Future):
- Move static files to S3/Cloud Storage
- Update Nginx to serve from CDN

---

## 🔧 Configuration Management

### Environment-Specific Settings

**Development** (`core/settings.py` with `.env.dev`):
```python
DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
SECURE_SSL_REDIRECT = False
```

**Production** (`core/settings.py` with `.env.prod`):
```python
DEBUG = False
ALLOWED_HOSTS = ["amardoc.reshad.dev", "www.amardoc.reshad.dev"]
CORS_ALLOWED_ORIGINS = ["https://amardoc.reshad.dev"]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### WSGI vs ASGI

- **Development**: Uvicorn with `--reload` flag
- **Production**: Uvicorn with 4 workers

```bash
# Development
python -m uvicorn core.asgi:application --reload

# Production
python -m uvicorn core.asgi:application --workers 4
```

---

## 🔍 Monitoring & Observability

### Container Status
```bash
docker compose ps
docker stats
```

### Logs
```bash
docker compose logs -f              # All services
docker compose logs -f django       # Specific service
docker compose logs --tail=100      # Last 100 lines
```

### Health Checks
```bash
# View health status
docker compose ps

# Test endpoints
curl http://localhost/health/
curl https://amardoc.reshad.dev/health/
```

### Metrics
```bash
# Database connections
docker compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Cache statistics
docker compose exec redis redis-cli INFO stats

# Task queue status
docker compose exec celery celery -A core inspect active
```

---

## 🛠️ Troubleshooting Guide

### Common Issues

**"Connection refused" errors**:
- Services may not be fully started
- Check: `docker compose ps` - wait for "healthy" status
- View logs: `docker compose logs db`

**WebSocket connection fails**:
- Nginx WebSocket headers may be missing
- Check: `nginx/prod/default.conf` has `Upgrade` headers
- Verify Redis: `docker compose logs redis`

**Static files return 404**:
- Run: `docker compose exec django python manage.py collectstatic --noinput`
- Check: `ls -la staticfiles/`
- Verify Nginx config includes static path

**Database migration errors**:
- Check: `docker compose logs django` for detailed error
- Ensure database is accessible: `docker compose exec db psql -U postgres -c "SELECT 1"`
- Run migrations: `docker compose exec django python manage.py migrate --noinput`

**High memory usage**:
- Check: `docker stats` to identify problematic container
- Reduce Celery workers or Django ASGI workers
- Monitor: `docker compose logs django | grep "memory"`

---

## 📚 Documentation Links

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Step-by-step deployment guide
- [Django Settings](../core/core/settings.py) - Environment configuration
- [Nginx Config](../nginx/prod/default.conf) - Web server configuration
- [Docker Files](../docker/) - Container definitions
- [Requirements](../requirements/) - Python dependencies

---

## 🔗 External Resources

- [Django Documentation](https://docs.djangoproject.com/en/6.0/)
- [Django Channels](https://channels.readthedocs.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Last Updated**: May 2026
**Architecture Version**: 2.0
**Production Ready**: ✅ Yes
