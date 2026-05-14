# Makefile for Amardoctor Project
# Convenience commands for development and production

.PHONY: help dev-up dev-down dev-logs dev-shell dev-test prod-up prod-down prod-logs clean install migrate

help:
	@echo "Amardoctor Project - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "Development:"
	@echo "  make dev-up         - Start development environment with hot reload"
	@echo "  make dev-down       - Stop development environment"
	@echo "  make dev-logs       - View development logs (all services)"
	@echo "  make dev-shell      - Access Django shell"
	@echo "  make dev-test       - Run tests"
	@echo "  make dev-bash       - Access Django container bash"
	@echo ""
	@echo "Production:"
	@echo "  make prod-up        - Start production environment (detached)"
	@echo "  make prod-down      - Stop production environment"
	@echo "  make prod-logs      - View production logs (all services)"
	@echo "  make prod-restart   - Restart production services"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run database migrations (dev)"
	@echo "  make migrate-prod   - Run database migrations (prod)"
	@echo "  make createsuperuser - Create admin user (dev)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make clean-prod     - Remove production containers and volumes"
	@echo "  make backup         - Backup production database"
	@echo ""

# Development Commands
dev-up:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-shell:
	docker compose -f docker-compose.dev.yml exec django python manage.py shell

dev-bash:
	docker compose -f docker-compose.dev.yml exec django bash

dev-test:
	docker compose -f docker-compose.dev.yml exec django pytest

dev-test-verbose:
	docker compose -f docker-compose.dev.yml exec django pytest -v

# Production Commands
prod-up:
	docker compose -f docker-compose.prod.yml up -d --build
	@echo "✓ Production environment started"
	@echo "Check health: curl https://amardoc.reshad.dev/health/"

prod-down:
	docker compose -f docker-compose.prod.yml down
	@echo "✓ Production environment stopped"

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-restart:
	docker compose -f docker-compose.prod.yml restart

prod-status:
	docker compose -f docker-compose.prod.yml ps

# Database Commands
migrate:
	docker compose -f docker-compose.dev.yml exec django python manage.py migrate
	@echo "✓ Migrations applied"

migrate-prod:
	docker compose -f docker-compose.prod.yml exec django python manage.py migrate
	@echo "✓ Migrations applied (production)"

createsuperuser:
	docker compose -f docker-compose.dev.yml exec django python manage.py createsuperuser

collectstatic:
	docker compose -f docker-compose.dev.yml exec django python manage.py collectstatic --noinput

collectstatic-prod:
	docker compose -f docker-compose.prod.yml exec django python manage.py collectstatic --noinput

# Backup & Maintenance
backup:
	@echo "Creating production database backup..."
	docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres -d amardoctor_prod > backups/backup-$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup completed"

backup-list:
	@ls -lh backups/ | tail -n +2

restore:
	@read -p "Enter backup file: " backup; \
	echo "Restoring from $$backup..."; \
	cat $$backup | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d amardoctor_prod; \
	echo "✓ Restore completed"

# Cleanup Commands
clean:
	docker compose -f docker-compose.dev.yml down -v
	rm -rf staticfiles/ media/
	@echo "✓ Development environment cleaned"

clean-prod:
	docker compose -f docker-compose.prod.yml down -v
	@echo "⚠️  Production volumes removed"

clean-all: clean clean-prod
	docker system prune -f
	@echo "✓ All Docker resources cleaned"

# SSL Commands
ssl-renew:
	docker compose -f docker-compose.prod.yml exec certbot certbot renew
	docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
	@echo "✓ SSL certificates renewed"

ssl-issue:
	docker run -it --rm \
		-v $$(pwd)/ssl/certbot/conf:/etc/letsencrypt \
		-v $$(pwd)/ssl/www:/var/www/certbot \
		certbot/certbot certonly --standalone \
		-d amardoc.reshad.dev \
		-d www.amardoc.reshad.dev \
		--agree-tos \
		--email reshad@example.com

# Utility Commands
ps:
	docker compose -f docker-compose.dev.yml ps

ps-prod:
	docker compose -f docker-compose.prod.yml ps

stats:
	docker stats

install:
	pip install -r requirements/dev.txt

install-prod:
	pip install -r requirements/prod.txt

lint:
	docker compose -f docker-compose.dev.yml exec django flake8 core/

format:
	docker compose -f docker-compose.dev.yml exec django black core/

# Health Checks
health:
	@echo "Development Health Check:"
	@docker compose -f docker-compose.dev.yml ps
	@echo ""
	@echo "Checking services..."
	@docker compose -f docker-compose.dev.yml exec django curl -s http://localhost:8000/health/ || echo "❌ Django not responding"

health-prod:
	@echo "Production Health Check:"
	@docker compose -f docker-compose.prod.yml ps
	@echo ""
	@echo "Checking services..."
	@curl -s https://amardoc.reshad.dev/health/ || echo "❌ Production not responding"

.DEFAULT_GOAL := help
