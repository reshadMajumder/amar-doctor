# Amardoctor Quick Reference

## 🚀 One-Minute Setup

### Development
```bash
./scripts/setup-dev.sh
# Access: http://localhost
```

### Production
```bash
./scripts/deploy.sh
# Access: https://amardoc.reshad.dev
```

---

## 📋 Essential Commands

### Development (Hot Reload)
```bash
# Start
make dev-up

# Stop
make dev-down

# Logs
make dev-logs

# Access
http://localhost/api/
ws://localhost/ws/

# Migrations
make migrate

# Tests
make dev-test

# Admin
make createsuperuser
# Then: http://localhost/admin/
```

### Production (SSL Ready)
```bash
# Start
make prod-up

# Stop
make prod-down

# Logs
make prod-logs

# Status
make prod-status

# Restart
make prod-restart

# Access
https://amardoc.reshad.dev/api/
wss://amardoc.reshad.dev/ws/
```

### Database
```bash
# Run migrations
make migrate              # development
make migrate-prod         # production

# Create admin
make createsuperuser      # development only

# Backup production
make backup

# Restore from backup
make restore
```

### Utilities
```bash
# View all commands
make help

# Health check
make health               # development
make health-prod          # production

# Docker stats
make stats

# Cleanup
make clean                # development only
make clean-prod           # production (destructive!)
```

---

## 🏗️ Project Structure

```
amardoctor/
├── core/                    # Django project
├── requirements/            # Python dependencies
│   ├── base.txt            # Core packages
│   ├── dev.txt             # Development tools
│   └── prod.txt            # Production packages
├── docker/                  # Dockerfiles
│   ├── dev/django/
│   └── prod/django/
├── scripts/                 # Setup & deployment
│   ├── setup-dev.sh        # Dev setup
│   ├── deploy.sh           # Prod deployment
│   └── entrypoint.*.sh     # Container entry
├── nginx/                   # Reverse proxy config
│   ├── dev/
│   └── prod/
├── ssl/                     # SSL certificates (git-ignored)
├── docker-compose.dev.yml   # Development services
├── docker-compose.prod.yml  # Production services
├── .env.dev                 # Dev configuration
├── .env.prod.template       # Prod template
├── Makefile                 # Convenience commands
├── DEPLOYMENT.md            # Deployment guide
├── INFRASTRUCTURE.md        # Architecture docs
└── IMPLEMENTATION_SUMMARY.md # This implementation
```

---

## 🔄 Service Architecture

### Development
```
You (localhost)
    ↓
Nginx:80 (dev)
    ↓
Django:8000 (uvicorn --reload)
    ↓
PostgreSQL:5432 + Redis:6379
    ↓
Celery Worker + Celery Beat
```

### Production
```
Internet (https://amardoc.reshad.dev)
    ↓
Nginx:443 (SSL + reverse proxy)
    ↓
Django:8000 (4 uvicorn workers)
    ↓
PostgreSQL (persistent) + Redis
    ↓
Celery (4 workers) + Celery Beat + Certbot
```

---

## 🔐 Security

### Development (`.env.dev`)
- DEBUG=True
- ALLOWED_HOSTS=*
- CORS_ALLOW_ALL_ORIGINS=True
- HTTP only

### Production (`.env.prod`)
- DEBUG=False
- ALLOWED_HOSTS=amardoc.reshad.dev
- CORS restricted
- HTTPS enforced
- Security headers enabled
- NEVER committed to git

---

## 📝 Environment Variables

### Create for Development
```bash
# Already created: .env.dev
# No action needed
```

### Create for Production
```bash
# Copy template
cp .env.prod.template .env.prod

# Edit with secrets
nano .env.prod

# Required fields:
# - SECRET_KEY
# - DB_PASSWORD
# - EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
# - GEMINI_API_KEY
# - SSL_STORE_ID, SSL_STORE_PASSWORD
# - And others...
```

---

## 🐛 Troubleshooting

### Services Not Starting?
```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Wait for services to be healthy
# Typically takes 20-30 seconds
```

### WebSockets Not Working?
```bash
# Verify Redis is running
docker compose ps redis

# Check Nginx headers
grep -i "Upgrade\|Connection" nginx/prod/default.conf

# Check Django logs
docker compose logs django | grep -i websocket
```

### Static Files Return 404?
```bash
# Collect static files
make collectstatic

# Verify files exist
ls -la staticfiles/

# Restart Nginx
make prod-restart
```

### Database Issues?
```bash
# Check database is running
docker compose ps db

# Check logs
docker compose logs db

# Run migrations
make migrate
```

---

## 📚 Documentation

| Document | Content |
|----------|---------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step guides, troubleshooting |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Architecture, monitoring, scaling |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | What was built, checklist |
| [README.md](README.md) | Project overview |
| [Makefile](Makefile) | All available commands |

---

## 🔗 Key URLs

### Development
- API: `http://localhost/api/`
- Admin: `http://localhost/admin/`
- WebSocket: `ws://localhost/ws/`
- Health: `http://localhost/health/`

### Production
- API: `https://amardoc.reshad.dev/api/`
- Admin: `https://amardoc.reshad.dev/admin/`
- WebSocket: `wss://amardoc.reshad.dev/ws/`
- Health: `https://amardoc.reshad.dev/health/`

---

## 📊 Services & Ports

### Internal (Docker Network)
| Service | Host | Port |
|---------|------|------|
| Django | django | 8000 |
| PostgreSQL | db | 5432 |
| Redis | redis | 6379 |

### External (Exposed)
| Service | Dev Port | Prod Port |
|---------|----------|-----------|
| Nginx HTTP | 80 | 80 |
| Nginx HTTPS | - | 443 |
| Django (direct) | 8000 | None |
| PostgreSQL | 5432 | None |
| Redis | 6379 | None |

---

## 🚀 Deployment Steps

### Development
1. Run `./scripts/setup-dev.sh`
2. Wait for "Development setup complete!"
3. Access http://localhost
4. Create superuser: `make createsuperuser`

### Production
1. Edit `.env.prod` with production secrets
2. Generate SSL certificate first (see DEPLOYMENT.md)
3. Run `./scripts/deploy.sh`
4. Create superuser: `docker compose -f docker-compose.prod.yml exec django python manage.py createsuperuser`
5. Access https://amardoc.reshad.dev

---

## ✅ Verification

### Health Check
```bash
# Development
curl http://localhost/health/

# Production
curl https://amardoc.reshad.dev/health/
```

### Service Status
```bash
make health              # dev
make health-prod         # prod
```

### Docker Stats
```bash
make stats               # Resource usage
```

---

## 🔄 Common Workflows

### Daily Development
```bash
# Start
make dev-up

# Make code changes (auto-reload)
# ...

# Run tests
make dev-test

# Stop
make dev-down
```

### Adding Dependencies
```bash
# Edit requirements/base.txt (or dev.txt/prod.txt)

# Rebuild container
make dev-up              # rebuilds automatically

# Or force rebuild
docker compose -f docker-compose.dev.yml up --build
```

### Database Migrations
```bash
# After modifying models.py
python manage.py makemigrations

# In container
docker compose exec django python manage.py makemigrations
docker compose exec django python manage.py migrate

# Or use shortcut
make migrate
```

### Deploying Changes to Production
```bash
# 1. Push to git
git add .
git commit -m "Your changes"
git push

# 2. SSH to server
ssh user@server

# 3. Pull changes
cd amardoctor
git pull

# 4. Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📞 Quick Help

### View all Makefile commands
```bash
make help
```

### Access Django shell (development)
```bash
make dev-shell
```

### Access Django shell (production)
```bash
docker compose -f docker-compose.prod.yml exec django python manage.py shell
```

### View logs in real-time
```bash
make dev-logs        # all services
docker compose logs -f django      # specific service
```

### Get bash access to container
```bash
docker compose exec django bash
```

---

## 🎯 Remember

- ✅ **Development**: `docker-compose.dev.yml`
- ✅ **Production**: `docker-compose.prod.yml`
- ✅ **Never**: `docker-compose.yml` (deprecated)
- ✅ **Never**: `runserver` in any environment
- ✅ **Always**: Use `--reload` in development
- ✅ **Always**: Set `DEBUG=False` in production
- ✅ **Always**: Use SSL in production
- ✅ **Always**: Backup database regularly

---

**Last Updated**: May 2026
**Status**: Production Ready ✅
