# Amardoctor Deployment Guide

## 🎯 Overview

This project is configured for production-ready deployment with:
- **ASGI**: Uvicorn server with hot reload in dev, multi-worker in prod
- **WebSockets**: Full support via Channels + Redis
- **Containers**: Separate dev/prod Docker compose files
- **Nginx**: Reverse proxy with HTTP bootstrap, then SSL termination
- **SSL**: Automated with Certbot and Let's Encrypt
- **Database**: PostgreSQL 17 with persistence
- **Task Queue**: Celery with Redis broker
- **Static Files**: Nginx serving + WhiteNoise compression

---

## 📁 Project Structure

```
amardoctor/
├── core/              # Django project folder
├── requirements/      # Split requirements (base, dev, prod)
├── docker/           # Dockerfiles (dev/prod)
├── scripts/          # Entrypoint scripts
├── nginx/            # Nginx configs (dev/prod)
├── ssl/              # SSL certificates (ignored in git)
├── docker-compose.dev.yml   # Development orchestration
├── docker-compose.prod.yml  # Production orchestration
├── .env.dev          # Development environment
└── .env.prod         # Production environment (NEVER commit)
```

---

## 🚀 Quick Start - Development

### Prerequisites
- Docker & Docker Compose installed
- `.env.dev` file in root (already created, configured for localhost)

### Run Development Environment

```bash
# Start all services with hot reload
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build

# Access the application
# API: http://localhost/api/
# WebSockets: ws://localhost/ws/
```

### Services Available

| Service | Port | URL |
|---------|------|-----|
| Django API | 8000 | http://localhost:8000 |
| Nginx | 80 | http://localhost |
| PostgreSQL | 5432 | db host |
| Redis | 6379 | redis host |
| Celery | - | amardoctor_celery_dev |
| Celery Beat | - | amardoctor_celery_beat_dev |

### Hot Reload

Changes to Python files automatically reload via Uvicorn:
```bash
# Just edit and save, server reloads automatically
```

### Access Admin Panel

```bash
# Create superuser (one-time)
docker compose --env-file .env.dev -f docker-compose.dev.yml exec django python manage.py createsuperuser

# Access admin
http://localhost/admin/
```

### Run Tests

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml exec django pytest
```

### View Logs

```bash
# All services
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f

# Specific service
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f django
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f celery
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f nginx
```

---

## 🌐 Production Deployment

### Prerequisites

1. **Server Requirements**
   - VPS or cloud instance (AWS, DigitalOcean, Linode, etc.)
   - Ubuntu 20.04+ or similar Linux distro
   - Docker & Docker Compose installed
   - Domain name (amardoc.reshad.dev)
   - DNS pointing to server IP

2. **Environment Setup**

```bash
# SSH into server
ssh user@your_server_ip

# Clone repository
git clone <your-repo-url> amardoctor
cd amardoctor

# Create production environment file
cp .env.prod.template .env.prod

# Edit with production values
nano .env.prod
```

### Production Environment Variables

Update `.env.prod` with:

```env
# Database
DB_NAME=amardoctor_prod
DB_USER=postgres
DB_PASSWORD=<SECURE_PASSWORD>
DB_HOST=db
DB_PORT=5432

# Secret Key (generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
SECRET_KEY=<LONG_RANDOM_KEY>

# Domain
ALLOWED_HOSTS=amardoc.reshad.dev
CORS_ALLOWED_ORIGINS=https://amardoc.reshad.dev
PUBLIC_DOMAIN=https://amardoc.reshad.dev

# Email
EMAIL_HOST_USER=<gmail-address>
EMAIL_HOST_PASSWORD=<gmail-app-password>

# AI & Payments
GEMINI_API_KEY=<your-key>
SSL_STORE_ID=<your-store-id>
SSL_STORE_PASSWORD=<your-store-password>
```

### Production Bootstrap Order

Use this order exactly:

1. Start Nginx on port 80 only.
2. Confirm HTTP works on `http://amardoc.reshad.dev`.
3. Run Certbot to generate the first certificate.
4. Restore the HTTPS blocks in `nginx/prod/default.conf` only after the certificate exists.
5. Reload Nginx and verify HTTPS.

### Initial SSL Certificate

Before enabling HTTPS, you need an initial SSL certificate:

```bash
# Generate the first certificate after HTTP is reachable
docker run -it --rm \
  -v /path/to/ssl/certbot/conf:/etc/letsencrypt \
  -v /path/to/ssl/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d amardoc.reshad.dev \
  --agree-tos \
  --email your-email@example.com

# After the certificate exists, restore the HTTPS server blocks in `nginx/prod/default.conf` and reload Nginx
```

### Start Production Services

```bash
# Build and start the HTTP bootstrap stack (detached)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Verify all services are running
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# Check logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

### Verify Deployment

```bash
# Check health over HTTP first
curl http://amardoc.reshad.dev/health/

# Check static files
curl http://amardoc.reshad.dev/static/admin/css/base.css

# Check Django API
curl http://amardoc.reshad.dev/api/

# Check WebSocket connectivity
wscat -c ws://amardoc.reshad.dev/ws/your-consumer-path/
```

### Enable HTTPS After Certificate Creation

Once Certbot has created the certificate and placed it under `ssl/certbot/conf`, restore the HTTPS server blocks in `nginx/prod/default.conf`, then reload Nginx.

```bash
# Reload Nginx after enabling the HTTPS config
docker compose --env-file .env.prod -f docker-compose.prod.yml exec nginx nginx -s reload

# Verify HTTPS after the certificate is present
curl https://amardoc.reshad.dev/health/
```

### Database Migrations

```bash
# Run migrations
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django python manage.py migrate

# Create superuser
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django python manage.py createsuperuser
```

### SSL Certificate Renewal

Certbot in production automatically renews certificates every 12 hours after HTTPS is enabled. Check renewal logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs certbot
```

To manually renew:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec certbot certbot renew
docker compose --env-file .env.prod -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Nginx Bootstrap Notes

- Keep the production Nginx config on port 80 only until the first certificate exists.
- Do not add `www` redirects unless you actually serve that hostname.
- The first successful health check should be `http://amardoc.reshad.dev/health/`.

### Persistent Data

All data is stored in named Docker volumes:

- **PostgreSQL**: `postgres_data_prod` → `/var/lib/postgresql/data`
- **Redis**: `redis_data_prod` → `/data`
- **Static Files**: `./staticfiles/` → Nginx serves directly
- **Media Files**: `./media/` → Nginx serves directly

To backup:

```bash
# Backup PostgreSQL
docker compose --env-file .env.prod -f docker-compose.prod.yml exec db pg_dump -U postgres -d amardoctor_prod > backup.sql

# Restore PostgreSQL
cat backup.sql | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db psql -U postgres -d amardoctor_prod
```

---

## 🔧 Maintenance

### View Logs

```bash
# All services
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f

# Specific service
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f django
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f celery
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f nginx
```

### Restart Services

```bash
# Restart specific service
docker compose --env-file .env.prod -f docker-compose.prod.yml restart django

# Restart all
docker compose --env-file .env.prod -f docker-compose.prod.yml restart
```

### Scale Workers

```bash
# Increase Celery workers
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --scale celery=3
```

### Database Backup Schedule

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * docker compose --env-file /path/to/.env.prod -f /path/to/docker-compose.prod.yml exec db pg_dump -U postgres -d amardoctor_prod > /path/to/backups/backup-$(date +\%Y\%m\%d).sql
```

---

## 🐛 Troubleshooting

### WebSockets Not Working

**Symptoms**: ws:// connections fail or timeout

**Check**:
```bash
# Verify Nginx is proxying WebSocket headers
docker compose --env-file .env.prod -f docker-compose.prod.yml logs nginx | grep -i upgrade

# Verify Redis is running
docker compose --env-file .env.prod -f docker-compose.prod.yml logs redis | grep -i "ready"
```

**Fix**:
```nginx
# Nginx config should have:
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Static Files Not Loading

**Symptoms**: 404 on /static/ paths

**Check**:
```bash
# Verify collectstatic ran
docker compose --env-file .env.prod -f docker-compose.prod.yml logs django | grep "collectstatic"

# Verify files exist
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django ls -la /app/staticfiles/
```

**Fix**:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django python manage.py collectstatic --noinput --clear
docker compose --env-file .env.prod -f docker-compose.prod.yml restart nginx
```

### Database Connection Errors

**Symptoms**: "no such table" or "connection refused"

**Check**:
```bash
# Verify DB is running and healthy
docker compose --env-file .env.prod -f docker-compose.prod.yml ps db

# Check DB logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs db
```

**Fix**:
```bash
# Run migrations
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django python manage.py migrate

# Recreate volumes if corrupted
docker compose --env-file .env.prod -f docker-compose.prod.yml down -v
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### High Memory Usage

**Symptoms**: Services becoming slow or crashing

**Check**:
```bash
docker stats
```

**Fix**: Adjust in `.env.prod`:
```env
# Reduce Celery workers
# Reduce Redis maxmemory
# Increase database connections
```

---

## 📊 Monitoring

### Health Checks

All services have health checks configured. View status:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Expected: `healthy` status for all services

### Performance Metrics

```bash
# View resource usage
docker stats

# View database metrics
docker compose --env-file .env.prod -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT * FROM pg_stat_statements;"
```

### Logging

All services log to stdout, captured by Docker:

```bash
# Real-time logs with timestamps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f --timestamps
```

---

## 🔐 Security Checklist

- [ ] Change SECRET_KEY in production
- [ ] Set DEBUG=False in production
- [ ] Use strong database password
- [ ] Configure ALLOWED_HOSTS
- [ ] Enable HTTPS redirect
- [ ] Set CSRF_COOKIE_SECURE=True
- [ ] Set SESSION_COOKIE_SECURE=True
- [ ] Never commit `.env.prod` file
- [ ] Regular SSL certificate renewal (automated)
- [ ] Backup database regularly
- [ ] Monitor logs for errors
- [ ] Keep Docker images updated

---

## 📝 Commands Reference

### Development
```bash
# Start
docker compose --env-file .env.dev -f docker-compose.dev.yml up --build

# Stop
docker compose --env-file .env.dev -f docker-compose.dev.yml down

# Logs
docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f

# Run command
docker compose --env-file .env.dev -f docker-compose.dev.yml exec django python manage.py <command>
```

### Production
```bash
# Start
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Stop
docker compose --env-file .env.prod -f docker-compose.prod.yml down

# Logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f

# Run command
docker compose --env-file .env.prod -f docker-compose.prod.yml exec django python manage.py <command>

# Restart service
docker compose --env-file .env.prod -f docker-compose.prod.yml restart <service-name>
```

---

## 🚀 Next Steps

1. **Test locally**: `docker compose -f docker-compose.dev.yml up`
2. **Deploy to staging**: Run on a staging server first
3. **Monitor**: Check logs and metrics regularly
4. **Backup**: Set up automated database backups
5. **CI/CD**: Consider setting up automated deployments

---

## 📞 Support

For issues or questions:
- Check logs: `docker compose ... logs -f`
- Review Nginx config: `nginx/prod/default.conf`
- Check Django settings: `core/settings.py`

---

**Last Updated**: May 2026
**Django Version**: 6.0.5
**Docker Compose Version**: 3.8
