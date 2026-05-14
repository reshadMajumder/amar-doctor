# Amar Doctor 🏥

A comprehensive AI-powered healthcare platform connecting patients with doctors for virtual consultations, medical guidance, and emergency triage.

> **⚠️ Important**: This project uses a production-ready Docker deployment architecture. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions.

## 🚀 Quick Start

### Development (with hot reload)
```bash
./scripts/setup-dev.sh
# or
docker compose -f docker-compose.dev.yml up --build
```

### Production (with SSL)
```bash
./scripts/deploy.sh
# or
docker compose -f docker-compose.prod.yml up -d --build
```

### Using Makefile
```bash
make dev-up        # Start development
make prod-up       # Start production
make help          # View all commands
```

## 🚀 Features

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
