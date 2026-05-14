# Amar Doctor 🏥

A comprehensive AI-powered healthcare platform connecting patients with doctors for virtual consultations, medical guidance, and emergency triage. Built with WebSocket support for real-time communications.

> **⚠️ Important**: This project uses a production-ready Docker deployment architecture with WebSocket support. See [Deployment Guide](#-deployment) below for detailed setup instructions.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed and running
- Git
- `core/.env` file configured with database and Redis settings

### Development (with hot reload & WebSockets)
```bash
chmod +x deploy.sh      # Make script executable (if needed)
./deploy.sh dev
```
Services run in foreground. Press `Ctrl+C` to stop.

### Production (with SSL & WebSockets)
```bash
./deploy.sh prod
```
Services run in background. Check status with `./deploy.sh status`.

### All Available Commands
```bash
./deploy.sh dev       # Start development with auto-reload (foreground)
./deploy.sh prod      # Start production (background)
./deploy.sh logs      # View real-time logs from all services
./deploy.sh status    # Check status of all services
./deploy.sh restart   # Restart all running services
./deploy.sh stop      # Stop all services
./deploy.sh down      # Stop and remove containers
./deploy.sh build     # Build container images only
```

### Direct Docker Compose Commands
If you prefer to run docker compose directly:

**Development:**
```bash
docker compose --env-file core/.env -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Production:**
```bash
docker compose --env-file core/.env up -d --build
```

**View Logs:**
```bash
docker compose --env-file core/.env logs -f
```

## � Deployment Guide

### Architecture Overview
This project is a backend-only API with:
- **API Backend**: Django ASGI application with WebSocket support via Daphne
- **Database**: PostgreSQL with persistent volumes
- **Cache**: Redis for session/cache management and Celery broker
- **Task Queue**: Celery worker + Beat scheduler for async tasks
- **Real-time Communication**: Django Channels with WebSocket support
- **Reverse Proxy**: Nginx for SSL termination and routing

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/amar-doctor.git
   cd amar-doctor
   ```

2. **Create and configure environment file**
   ```bash
   # The .env file should be in the core/ directory
   cat > core/.env << EOF
   # Database Configuration
   DB_NAME=amardoctor
   DB_USER=postgres
   DB_PASSWORD=your_secure_password_here
   DB_HOST=db
   DB_PORT=5432
   
   # Django Configuration
   SECRET_KEY=your_django_secret_key_here
   DEBUG=False
   ALLOWED_HOSTS=amardoc.reshad.dev,localhost,127.0.0.1
   
   # CORS Configuration
   CORS_ALLOWED_ORIGINS=https://amardoc.reshad.dev
   CSRF_TRUSTED_ORIGINS=https://amardoc.reshad.dev
   
   # Redis Configuration
   REDIS_URL=redis://redis:6379/1
   REDIS_HOST=redis
   REDIS_PORT=6379
   
   # Celery Configuration
   CELERY_BROKER_URL=redis://redis:6379/0
   CELERY_RESULT_BACKEND=redis://redis:6379/0
   
   # Environment
   ENVIRONMENT=prod
   EOF
   ```

3. **Update configuration for your setup**
   - Replace `your_secure_password_here` with a strong database password
   - Replace `your_django_secret_key_here` with Django secret key
   - Update domain to match your deployment domain
   - Adjust other settings as needed

### Development Deployment

**Local development with hot reload and WebSocket support:**

Using the deployment script:
```bash
./deploy.sh dev
```

Or using docker compose directly:
```bash
docker compose --env-file core/.env -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Services will be available at:**
- API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws/
- Nginx proxy: http://localhost:80
- PostgreSQL: localhost:5432
- Redis: localhost:6379

**What's included:**
- PostgreSQL database with development settings
- Redis cache and Celery broker
- Celery worker & beat scheduler for tasks
- Django development server with auto-reload
- Daphne ASGI server with WebSocket support
- Nginx reverse proxy
- ngrok tunnel support for webhooks

**First time setup - Run migrations:**
```bash
# In another terminal while dev is running:
docker compose --env-file core/.env exec core python manage.py migrate
docker compose --env-file core/.env exec core python manage.py createsuperuser
```

### Production Deployment

**Deploy to production with SSL and optimizations:**

1. **Set up SSL certificates (see [SSL/TLS Certificate Setup](#ssltls-certificate-setup) section)**

2. **Update core/.env with production values:**
   ```bash
   # Update these in core/.env:
   DEBUG=False
   ENVIRONMENT=prod
   ALLOWED_HOSTS=amardoc.reshad.dev,localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=https://amardoc.reshad.dev
   CSRF_TRUSTED_ORIGINS=https://amardoc.reshad.dev
   SECRET_KEY=your_strong_secret_key
   DB_PASSWORD=your_strong_db_password
   ```

3. **Deploy using the script:**
   ```bash
   ./deploy.sh prod
   ```

   Or using docker compose directly:
   ```bash
   docker compose --env-file core/.env up -d --build
   ```

4. **Check status:**
   ```bash
   ./deploy.sh status
   # or
   docker compose --env-file core/.env ps
   ```

5. **View logs:**
   ```bash
   ./deploy.sh logs
   # or
   docker compose --env-file core/.env logs -f
   ```

**First time setup - Run migrations:**
```bash
docker compose --env-file core/.env exec core python manage.py migrate
docker compose --env-file core/.env exec core python manage.py createsuperuser
```

**What's included:**
- Production-grade Gunicorn/Daphne server
- Nginx with SSL/TLS termination
- Health checks for all services
- Automatic service restart on failure
- Redis persistence with RDB and AOF
- Connection pooling optimized for production
- Secure WebSocket (WSS) support

### SSL/TLS Certificate Setup

The project is configured to use SSL certificates for HTTPS. Certificates should be placed in the `ssl/` directory:

```bash
# Create SSL directory if it doesn't exist
mkdir -p ssl

# Copy your certificate and key
# ssl/cert.pem    - Your SSL certificate
# ssl/key.pem     - Your SSL private key
```

**For Let's Encrypt (recommended):**
```bash
# Stop any running services first
./deploy.sh stop

# Generate certificates using Certbot
certbot certonly --standalone -d amardoc.reshad.dev

# Copy to ssl directory (adjust paths based on your system)
sudo cp /etc/letsencrypt/live/amardoc.reshad.dev/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/amardoc.reshad.dev/privkey.pem ssl/key.pem

# Make sure permissions are correct
sudo chmod 644 ssl/cert.pem ssl/key.pem

# Start services again
./deploy.sh prod
```

**Certificate renewal:**
```bash
# Certbot auto-renewal (set up in crontab):
0 2 * * * certbot renew --quiet && cp /etc/letsencrypt/live/amardoc.reshad.dev/fullchain.pem /path/to/project/ssl/cert.pem && cp /etc/letsencrypt/live/amardoc.reshad.dev/privkey.pem /path/to/project/ssl/key.pem && docker compose -f /path/to/project/docker-compose.yml restart nginx
```

### Domain Configuration

The project is configured to serve the API on your domain. Update your domain references in:
- `docker-compose.yml` - ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS
- `nginx/nginx.conf` - server_name directives

**Production domain:**
- `amardoc.reshad.dev` - API endpoint

### Service URLs

**Development:**
- API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws/ (Django Channels)
- Nginx proxy: http://localhost:80
- PostgreSQL: localhost:5432
- Redis: localhost:6379

**Production:**
- API: https://amardoc.reshad.dev
- WebSocket: wss://amardoc.reshad.dev/ws/ (secure WebSocket)

### Database Management

**Before first deployment - Run migrations and create superuser:**
```bash
# Apply database migrations
docker compose --env-file core/.env exec core python manage.py migrate

# Create superuser account
docker compose --env-file core/.env exec core python manage.py createsuperuser

# Create additional admin
docker compose --env-file core/.env exec core python manage.py createsuperuser
```

**Useful database commands:**
```bash
# Make migrations for changes
docker compose --env-file core/.env exec core python manage.py makemigrations

# Apply migrations
docker compose --env-file core/.env exec core python manage.py migrate

# Access Django shell
docker compose --env-file core/.env exec core python manage.py shell

# Backup database
./scripts/db-backup.sh

# Restore database
./scripts/db-restore.sh

# Delete all data and reset
docker compose --env-file core/.env exec core python manage.py flush
```

### Celery Task Queue

```bash
# View Celery worker logs
docker compose --env-file core/.env logs celery_worker -f

# View Celery beat scheduler logs
docker compose --env-file core/.env logs celery_beat -f

# Monitor Celery tasks
docker compose --env-file core/.env exec celery_worker celery -A core inspect active

# View registered tasks
docker compose --env-file core/.env exec celery_worker celery -A core inspect registered

# Purge all tasks from queue
docker compose --env-file core/.env exec celery_worker celery -A core purge
```

### Monitoring & Maintenance

**View logs:**
```bash
# All services
./deploy.sh logs

# Specific service
docker compose --env-file core/.env logs core -f          # Django API
docker compose --env-file core/.env logs celery_worker -f # Background tasks
docker compose --env-file core/.env logs celery_beat -f   # Scheduled tasks
docker compose --env-file core/.env logs redis -f         # Cache/broker
docker compose --env-file core/.env logs db -f            # Database
docker compose --env-file core/.env logs nginx -f         # Reverse proxy
```

**Service management:**
```bash
# Check service status
./deploy.sh status
# or
docker compose --env-file core/.env ps

# Validate Nginx configuration
docker compose --env-file core/.env exec nginx nginx -t

# Restart services
./deploy.sh restart

# Restart specific service
docker compose --env-file core/.env restart core

# Stop services
./deploy.sh stop

# Shut down and remove containers
./deploy.sh down
```

**Health checks:**
```bash
# Check service health
docker compose --env-file core/.env ps

# Services marked as "healthy" are running properly
# Check logs if any service shows "unhealthy"
```

### Scaling Considerations

**For production, consider:**

1. **Database**: Use managed PostgreSQL service (AWS RDS, DigitalOcean)
2. **Redis**: Use managed Redis service (AWS ElastiCache, DigitalOcean)
3. **Celery**: Scale workers by running multiple containers or using dedicated task workers
4. **Static Files**: Use CDN (CloudFront, Cloudflare) for static assets
5. **Load Balancing**: Use load balancer in front of Nginx for HA and scaling
6. **WebSocket Scaling**: Use Redis as message broker for multiple Celery workers

### Troubleshooting

**"core/.env file not found" error:**
```bash
# Create the .env file in core directory
cat > core/.env << EOF
DB_NAME=amardoctor
DB_USER=postgres
DB_PASSWORD=your_password
# ... (add other variables from the Environment Setup section)
EOF
```

**Services fail to start:**
```bash
# Check logs for errors
./deploy.sh logs

# Verify .env file exists and has correct format
cat core/.env

# Make sure ports are not in use
lsof -i :8000  # API port
lsof -i :5432  # Database port
lsof -i :6379  # Redis port
lsof -i :80    # Nginx HTTP
lsof -i :443   # Nginx HTTPS
```

**WebSocket connection failures:**
- Ensure proxies support WebSocket upgrade headers
- Check CORS and CSRF settings match client domain
- Verify nginx configuration has Upgrade headers: `docker compose --env-file core/.env exec nginx nginx -t`
- Check Django Channels routing in `core/asgi.py`
- Review nginx logs: `docker compose --env-file core/.env logs nginx`

**Celery tasks not running:**
- Verify Redis is running: `docker compose --env-file core/.env logs redis`
- Check celery worker logs: `docker compose --env-file core/.env logs celery_worker`
- Ensure tasks are registered in the app
- Verify Redis connection: `docker compose --env-file core/.env exec redis redis-cli ping`

**Database connection errors:**
- Check PostgreSQL health: `docker compose --env-file core/.env ps db`
- Review DB logs: `docker compose --env-file core/.env logs db`
- Verify credentials in `core/.env`
- Check network connectivity: `docker compose --env-file core/.env exec core ping db`

**Permission issues:**
```bash
# Check volume mount permissions
ls -la ssl/
ls -la core/.env

# Fix permissions if needed
chmod 644 core/.env
chmod 755 ssl/
chmod 644 ssl/cert.pem ssl/key.pem
```

**Container disk space:**
```bash
# Clean up unused images and containers
docker system prune -a --volumes

# Remove specific container
docker compose --env-file core/.env down

# Rebuild everything
./deploy.sh build
```

---

## �🚀 Features

### 👨‍⚕️ For Doctors

- **AI Triage Assistant** - Automatically triage incoming patient messages using Gemini AI
- **Smart Response Generation** - Get AI-suggested responses to patient queries
- **Patient History** - View complete conversation history for each patient
- **Professional Dashboard** - Track patient interactions and manage consultations

### 👨‍⚕️ For Patients

- **AI Health Assistant** - Get instant medical guidance and triage
- **Doctor Consultation** - Chat with qualified doctors for expert advice
- **Health Monitoring** - Track symptoms and treatment progress
- **Emergency Support** - Get prioritized assistance during critical situations

## ⚙️ Tech Stack

### Backend
- **Framework**: Django 6.0 with ASGI (Uvicorn)
- **Database**: PostgreSQL 17
- **AI**: Google Gemini API
- **Real-time**: Django Channels & WebSockets
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Task Queue**: Celery with Beat scheduler
- **Web Server**: Nginx with SSL/TLS

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Notifications**: WebSockets

### Infrastructure
- **Containerization**: Docker & Docker Compose (dev/prod)
- **Web Server**: Nginx reverse proxy
- **ASGI Server**: Uvicorn
- **SSL**: Certbot + Let's Encrypt

## 📦 Installation

### Prerequisites
- Docker
- Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/reshadMajumder/amar-doctor.git
   cd amar-doctor
   ```

2. **Start the services**
   ```bash
   docker compose up -d
   ```

3. **Apply migrations**
   ```bash
   docker compose exec web python manage.py migrate
   ```

4. **Create superuser**
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Django Admin: [http://localhost:8000/admin](http://localhost:8000/admin)

## 📁 Project Structure

```
amardoctor/
├── core/                 # Django project root
│   ├── accounts/         # User authentication and profiles
│   ├── triage/           # AI triage and consultation logic
│   ├── chat/             # Real-time messaging
│   └── api/              # API endpoints
├── frontend/             # React frontend
├── docker/               # Docker configurations
└── nginx/                # Nginx configurations
```

## 🧪 Testing

Run tests using pytest:
```bash
docker compose exec web pytest
```

## 📂 Environment Variables

Create a `.env` file based on `.env.example`:
```env
DB_NAME=amardoctor
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## 📝 License

MIT License
