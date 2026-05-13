# Amardoctor: AI-Assisted Telemedicine Platform

Amardoctor is a production-grade telemedicine platform featuring AI-driven triage, a secure clinical ledger, realtime consultation chat, and an automated prescription system.

## 🚀 Key Features

- **AI Triage System**: Automated symptom analysis and specialist recommendations using Google Gemini.
- **Financial Infrastructure**: Audit-safe wallet system with escrow-style payment holding and automated commissions.
- **Realtime Consultations**: WebSocket-based chat system with presence indicators and message persistence.
- **Clinical Documentation**: Structured prescription system with automated PDF generation.
- **Event-Driven Notifications**: Realtime alerts via WebSockets, persistent in-app notifications, and async emails.

---

## 🛠️ Tech Stack

- **Backend**: Django & Django REST Framework
- **Realtime**: Django Channels & Redis
- **Database**: PostgreSQL
- **Task Queue**: Celery & Redis
- **Web Server**: Daphne & Nginx
- **Containerization**: Docker & Docker Compose

---

## 📦 Getting Started

### 1. Prerequisites
- Docker and Docker Compose installed.
- SSL certificates (for production mode) or use the provided setup script.

### 2. Environment Configuration
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Deployment

#### 🔹 Development Mode
Optimized for local coding with volume mounting and auto-reload.
```bash
./scripts/deploy.sh dev
```
Access the API at: `http://localhost:8000/api/v1/`

#### 🔹 Production Mode (Local Test)
Simulates a production environment with Nginx and SSL.
1. Generate self-signed certificates:
   ```bash
   ./scripts/setup_ssl.sh localhost
   ```
2. Deploy:
   ```bash
   ./scripts/deploy.sh prod
   ```
Access the API at: `https://localhost/api/v1/`

---

## 📖 API Documentation

The complete API documentation is available as a Postman Collection.
- **File**: `core/docs/Amardoctor_API.postman_collection.json`

### WebSocket Endpoints
- **AI Triage**: `ws://localhost:8000/ws/triage/{session_id}/`
- **Appointments**: `ws://localhost:8000/ws/appointments/`
- **Consultation Chat**: `ws://localhost:8000/ws/chat/{room_id}/`
- **Notifications**: `ws://localhost:8000/ws/notifications/`

---

## 🧪 Testing

Run the test suite using `pytest`:
```bash
docker compose exec web pytest
```

---

## 💻 CLI Reference

### Deployment Commands

| Command | When to use |
| :--- | :--- |
| `./scripts/deploy.sh dev` | **Daily Development**. Enables hot-reloading for code changes and keeps debug mode ON. |
| `./scripts/deploy.sh prod` | **Production Testing**. Starts Nginx with SSL and Daphne. Use this for final staging checks. |
| `docker compose down` | **Stop Services**. Safely stops and removes all running containers. |

### Database & Management

| Command | When to use |
| :--- | :--- |
| `docker compose exec web python manage.py makemigrations` | **Schema Changes**. Run this after adding or modifying Django models. |
| `docker compose exec web python manage.py migrate` | **Apply Changes**. Syncs the database with your latest migration files. |
| `docker compose exec web python manage.py createsuperuser` | **Admin Access**. Create the first administrative account for the dashboard. |
| `docker compose exec web python manage.py shell` | **Debugging**. Opens a Python REPL inside the running web container. |

### Logs & Monitoring

| Command | When to use |
| :--- | :--- |
| `docker compose logs -f` | **Full Monitoring**. Watch realtime logs for all services (DB, Web, Celery). |
| `docker compose logs -f web` | **Web Debugging**. Specifically monitor Django/Daphne request logs. |
| `docker compose logs -f celery` | **Task Debugging**. Track background tasks, AI processing, and emails. |

---

## 📁 Project Structure

```text
├── core/                   # Django Project Root
│   ├── chat/               # Realtime Consultation System
│   ├── prescriptions/      # Medical Documentation System
│   ├── notifications/      # Event-Driven Alert System
│   ├── payments/           # Financial Gateway & Escrow
│   ├── wallets/            # Ledger-based Wallet System
│   └── triage/             # AI Triage & Gemini Integration
├── nginx/                  # Nginx Configuration (SSL/Proxy)
├── scripts/                # Deployment & SSL Utility Scripts
├── ssl/                    # SSL Certificates (Git Ignored)
└── docker-compose.yml      # Base Orchestration
```

---

## 📜 License

---

## ☁️ DigitalOcean Deployment (amardoc.reshad.dev)

Follow these steps to deploy the platform to your DigitalOcean droplet:

### 1. Server Setup
- Create a Ubuntu Droplet.
- Point your domain `amardoc.reshad.dev` to the Droplet IP.
- Install Docker and Docker Compose on the server.

### 2. Prepare Environment
SSH into your droplet and clone the repo:
```bash
git clone <your-repo-url> amardoctor
cd amardoctor
cp .env.example .env
```
Update `.env` with your production values:
- `DEBUG=False`
- `DOMAIN=amardoc.reshad.dev`
- `ALLOWED_HOSTS=amardoc.reshad.dev`
- `PUBLIC_DOMAIN=https://amardoc.reshad.dev`

### 3. Initialize SSL (Let's Encrypt)
Run the following command to obtain your first certificate (use `sudo` if you get permission errors):
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot --webroot-path=/var/www/certbot \
  -d amardoc.reshad.dev
```

### 4. Deploy
Start all services in production mode:
```bash
./scripts/deploy.sh prod
```

### 5. Post-Deployment
Create your admin user:
```bash
docker compose exec web python manage.py createsuperuser
```
Check logs to ensure everything is running:
```bash
docker compose logs -f
```
