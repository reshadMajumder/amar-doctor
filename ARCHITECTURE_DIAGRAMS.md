# Amardoctor Architecture Diagrams

## Development Environment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Your Machine (Localhost)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Browser/Client                                                        │
│       │                                                                │
│       ├─HTTP:80──────────────┐                                        │
│       ├─WS:80────────────────┤                                        │
│       └─HTTP:8000────────────┤                                        │
│                              ↓                                        │
│                    ┌──────────────────┐                               │
│                    │  Nginx Container │                               │
│                    │  (reverse proxy)  │                               │
│                    │  - WebSocket      │                               │
│                    │  - Static/Media   │                               │
│                    └────────┬──────────┘                               │
│                             │ (internal network)                       │
│                             ↓                                         │
│                    ┌──────────────────────┐                           │
│                    │ Django Uvicorn       │                           │
│                    │ (auto reload)        │                           │
│                    │ - Hot code reload    │                           │
│                    │ - Full debug output  │                           │
│                    │ - Direct access OK   │                           │
│                    └────────┬─────────────┘                           │
│                    ↙        ↓         ↘                              │
│        ┌────────────┐  ┌────────────┐  ┌──────────────┐              │
│        │ PostgreSQL │  │   Redis    │  │    Celery    │              │
│        │ (persistent)  │ (cache,    │  │   + Beat     │              │
│        │            │  │  broker)   │  │  (async)     │              │
│        └────────────┘  └────────────┘  └──────────────┘              │
│                                                                         │
│  Volumes:                                                              │
│    ├─ ./core ↔ /app/core         (hot reload)                         │
│    ├─ ./staticfiles              (static files)                       │
│    └─ ./media                    (user uploads)                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Production Environment

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Internet (HTTPS)                                  │
│                    amardoc.reshad.dev:443                                │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────────┐
        │        Nginx Container (Reverse Proxy)      │
        │                                             │
        │  ┌─────────────────────────────────────┐  │
        │  │ SSL/TLS Termination                 │  │
        │  │ (Let's Encrypt + Certbot)           │  │
        │  │ - Certificate management            │  │
        │  │ - Auto renewal (12h check)          │  │
        │  └─────────────────────────────────────┘  │
        │                                             │
        │  ┌─────────────────────────────────────┐  │
        │  │ HTTP → HTTPS Redirect               │  │
        │  │ Security Headers (HSTS, CSP, etc.)  │  │
        │  └─────────────────────────────────────┘  │
        │                                             │
        │  ┌─────────────────────────────────────┐  │
        │  │ Request Routing                     │  │
        │  │ - /static/* → staticfiles/          │  │
        │  │ - /media/*  → media/                │  │
        │  │ - /ws/*     → Django WebSocket      │  │
        │  │ - /* → Django API                   │  │
        │  └─────────────────────────────────────┘  │
        │                                             │
        └──────────────────┬──────────────────────────┘
                           │ (private docker network)
                           │
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │   Django     │ │   Django     │ │   Django     │
   │  Uvicorn     │ │  Uvicorn     │ │  Uvicorn     │
   │  Worker 1    │ │  Worker 2    │ │  Worker 3    │
   │              │ │              │ │              │
   │ (+ 1 more)   │ │              │ │              │
   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
          │                 │                │
          └─────────────────┼────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        ┌────────────┐ ┌────────┐  ┌──────────────┐
        │ PostgreSQL │ │ Redis  │  │   Certbot    │
        │            │ │        │  │              │
        │ - Persistent│ │- Channel│ │ SSL Renewal  │
        │   volume   │ │  Layer │  │ (automated)  │
        │ - Replicas │ │- Celery│  │              │
        │   (future) │ │  Broker│  └──────────────┘
        └────────────┘ │- Cache │
                       └────────┘
                            │
                ┌───────────┼───────────┐
                ↓           ↓           ↓
           ┌────────┐ ┌────────────┐ ┌──────────┐
           │ Celery │ │ Celery     │ │ Celery   │
           │Worker 1│ │ Worker 2   │ │  Beat    │
           │        │ │ Worker 3   │ │(scheduler)
           │        │ │ Worker 4   │ │          │
           │        │ └────────────┘ └──────────┘
           └────────┘
```

---

## Network Flow Diagram

### Development Flow
```
Client Browser
     │
     ├─HTTP GET /api/users/ 
     │    └─→ Nginx:80 
     │        └─→ Django:8000 
     │            └─→ PostgreSQL:5432
     │                └─(return JSON)
     │
     ├─WebSocket Connection ws://localhost/ws/
     │    └─→ Nginx:80 (upgrade headers)
     │        └─→ Django:8000 (Channels consumer)
     │            └─→ Redis:6379 (channel layer)
     │                ├─(broadcast message)
     │                └─(other clients receive)
     │
     └─GET /static/admin/css/base.css
          └─→ Nginx:80
              └─(serve from mounted volume)
```

### Production Flow
```
Client Browser (HTTPS)
     │
     ├─HTTPS GET /api/users/
     │    └─→ Nginx:443 (SSL/TLS)
     │        ├─(verify certificate)
     │        └─→ Django:8000 (internal)
     │            └─→ PostgreSQL (persistent)
     │                └─(return JSON)
     │
     ├─WebSocket Connection wss://amardoc.reshad.dev/ws/
     │    └─→ Nginx:443 (SSL + upgrade headers)
     │        └─→ Django:8000 (Channels)
     │            └─→ Redis (channel layer)
     │                ├─(broadcast)
     │                └─(other clients)
     │
     └─GET /static/admin/css/base.css
          └─→ Nginx:443
              ├─(verify certificate)
              └─(serve from /staticfiles/)
```

---

## Service Dependencies

```
Startup Order:
│
├─1. PostgreSQL
│   └─ Must be healthy before Django starts
│       └─ wait_for_db.sh checks this
│
├─2. Redis
│   └─ Required for Channels and Celery
│       └─ Health check: redis-cli ping
│
├─3. Django
│   └─ Starts once DB and Redis are ready
│       ├─ Runs migrations
│       └─ Starts ASGI server
│
├─4. Celery Worker & Beat
│   └─ Depends on Django (for Django settings)
│       ├─ Worker: async task execution
│       └─ Beat: scheduled tasks
│
├─5. Nginx
│   └─ Reverse proxy (can start once Django is ready)
│       ├─ Routes requests
│       └─ Terminates SSL (prod)
│
└─6. Certbot (Production Only)
    └─ SSL certificate renewal loop
        └─ Runs independently
```

---

## Data Flow - API Request

### Development
```
1. Browser: GET /api/users/
2. Nginx: Route to Django
3. Django ASGI: Process request
   ├─ Authenticate via JWT
   ├─ Query PostgreSQL
   ├─ Cache result in Redis
   └─ Return JSON
4. Browser: Receive JSON response
```

### Production
```
1. Browser: HTTPS GET /api/users/
2. Nginx: Decrypt SSL/TLS
3. Nginx: Validate security headers
4. Nginx: Route to one of 4 Django workers
5. Django ASGI: Process request
   ├─ Authenticate via JWT
   ├─ Query PostgreSQL
   ├─ Cache in Redis
   └─ Return JSON
6. Nginx: Apply gzip compression
7. Nginx: Encrypt with SSL/TLS
8. Browser: Decrypt and display
```

---

## WebSocket Connection Flow

### Development
```
Client (Browser)
    │
    ├─ WebSocket Connect: ws://localhost/ws/triage/
    │
    ├─ Nginx (upgrade headers)
    │   ├─ Upgrade: websocket
    │   ├─ Connection: upgrade
    │   └─ Forward to Django
    │
    ├─ Django (Channels Consumer)
    │   ├─ Accept connection
    │   ├─ Subscribe to group via Redis
    │   └─ Listen for messages
    │
    ├─ Redis (Channel Layer)
    │   ├─ Store group subscriptions
    │   └─ Broadcast messages
    │
    └─ Message Loop
        ├─ Client sends: {"action": "message", "text": "..."}
        ├─ Django receives → processes
        ├─ Django broadcasts to Redis group
        ├─ All connected clients receive (via Redis)
        └─ Browser displays message
```

---

## Static/Media File Serving

### Development
```
Browser: GET /static/admin/css/base.css
    │
    ├─ Nginx: Route /static/ to /staticfiles/
    │
    ├─ Volume mount: ./staticfiles (your machine)
    │   └─ Files available immediately
    │
    └─ Response: CSS file
```

### Production
```
Browser: GET /static/admin/css/base.css
    │
    ├─ Nginx: Route /static/ to /staticfiles/
    │
    ├─ Container: Nginx reads from /staticfiles/
    │   ├─ Files collected by Django
    │   ├─ Compressed by WhiteNoise
    │   └─ Cached by browser
    │
    └─ Response: Gzipped CSS file
```

---

## SSL/TLS Certificate Lifecycle

### Initial Setup
```
1. Run Certbot container
   └─ certbot certonly --standalone
2. Generate certificate
   └─ Validates domain ownership
3. Save to ./ssl/certbot/conf/
4. Nginx mounts this volume
5. Nginx reads certificate from /etc/letsencrypt/

✓ Production goes live with HTTPS
```

### Automatic Renewal
```
Every 12 hours:
│
├─ Certbot checks certificate expiry
├─ If expires in <30 days:
│   ├─ Request renewal from Let's Encrypt
│   ├─ Validate domain (ACME challenge)
│   ├─ Update certificate
│   └─ Signal Nginx to reload
│
└─ If renewed:
    ├─ Nginx loads new certificate
    ├─ No downtime
    └─ Logging shows renewal
```

---

## Environment Configuration

### Development Flow
```
1. docker compose -f docker-compose.dev.yml up
2. Container starts
3. Load .env.dev file
   ├─ DB_HOST=db
   ├─ DEBUG=True
   ├─ ALLOWED_HOSTS=*
   └─ CORS_ALLOW_ALL_ORIGINS=True
4. Django starts with dev config
5. Hot reload on code changes
```

### Production Flow
```
1. docker compose -f docker-compose.prod.yml up
2. Container starts
3. Load .env.prod file
   ├─ DB_HOST=db (same)
   ├─ DEBUG=False
   ├─ ALLOWED_HOSTS=amardoc.reshad.dev
   └─ CORS restricted
4. Django starts with prod config
5. Uvicorn runs 4 workers
6. All security headers enabled
```

---

## Scaling Strategy (Future)

### Current (Single Instance)
```
┌─────────────────────────┐
│   Nginx (single)        │
└───────────┬─────────────┘
            │
      ┌─────┴──────┐
      ↓            ↓
  ┌────────┐ ┌──────────┐
  │Django  │ │PostgreSQL│
  │(x4)    │ │(single)  │
  └────────┘ └──────────┘
```

### Horizontal Scaling (Future)
```
┌──────────────────────────────────────┐
│  Load Balancer (future)              │
│  ├─ AWS ELB / HAProxy / Nginx        │
│  └─ Health check → instances         │
└───────────────────┬──────────────────┘
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Server │ │ Server │ │ Server │
   │ Node 1 │ │ Node 2 │ │ Node 3 │
   │        │ │        │ │        │
   │Nginx + │ │Nginx + │ │Nginx + │
   │Django  │ │Django  │ │Django  │
   └────────┘ └────────┘ └────────┘
        │           │          │
        └───────────┼──────────┘
                    ↓
        ┌──────────────────────┐
        │ PostgreSQL Cluster   │
        │ ├─ Primary           │
        │ ├─ Replica 1         │
        │ └─ Replica 2         │
        └──────────────────────┘
                    │
        ┌──────────────────────┐
        │ Redis Cluster        │
        │ ├─ Node 1            │
        │ ├─ Node 2            │
        │ └─ Node 3            │
        └──────────────────────┘
```

### Kubernetes Deployment (Future)
```
┌─────────────────────────────────────────┐
│ Kubernetes Cluster                      │
├─────────────────────────────────────────┤
│                                         │
│  Namespace: amardoctor                  │
│  │                                      │
│  ├─ Ingress (SSL termination)          │
│  │                                      │
│  ├─ Deployment: Django (replicas: 3)   │
│  │                                      │
│  ├─ StatefulSet: PostgreSQL            │
│  │                                      │
│  ├─ StatefulSet: Redis                 │
│  │                                      │
│  ├─ Deployment: Celery Worker (scale) │
│  │                                      │
│  └─ Deployment: Celery Beat            │
│                                         │
└─────────────────────────────────────────┘
```

---

**Architecture Diagrams Created**: May 2026
**Formats**: ASCII diagrams for documentation
**Scalability Planning**: Included for future growth
