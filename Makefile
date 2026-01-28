# Makefile for RBAC Authorization Platform

.PHONY: help setup db-reset db-migrate db-seed test build start stop clean

# Default target
help:
	@echo "RBAC Authorization Platform - Development Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  setup          - Install all dependencies"
	@echo "  db-setup       - Setup database (migrate + seed)"
	@echo ""
	@echo "Database Management:"
	@echo "  db-migrate     - Run database migrations"
	@echo "  db-seed        - Seed database with sample data"
	@echo "  db-reset       - Reset database (drop and recreate)"
	@echo "  db-shell       - Connect to database shell"
	@echo ""
	@echo "Development:"
	@echo "  start          - Start all services with docker-compose"
	@echo "  stop           - Stop all services"
	@echo "  restart        - Restart all services"
	@echo "  logs           - Show service logs"
	@echo "  test           - Run all tests"
	@echo "  test-unit      - Run unit tests"
	@echo "  test-int       - Run integration tests"
	@echo ""
	@echo "Build & Deployment:"
	@echo "  build          - Build all service images"
	@echo "  clean          - Clean build artifacts"
	@echo "  deploy         - Deploy to production (requires kubectl)"

# Setup commands
setup:
	@echo "Installing dependencies..."
	cd shared && npm install
	cd infrastructure/database && npm install
	@echo "Setup complete!"

# Database commands
db-migrate:
	@echo "Running database migrations..."
	cd infrastructure/database && npm run migrate:up

db-seed:
	@echo "Seeding database..."
	cd infrastructure/database && npm run seed

db-setup: db-migrate db-seed
	@echo "Database setup complete!"

db-reset:
	@echo "Resetting database..."
	docker-compose down -v
	docker-compose up -d database
	sleep 10
	make db-setup

db-shell:
	@echo "Connecting to database..."
	docker-compose exec database psql -U postgres -d rbac_platform

# Development commands
start:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "Services started! Visit http://localhost:3003 for admin dashboard"

stop:
	@echo "Stopping all services..."
	docker-compose down

restart: stop start

logs:
	@echo "Showing service logs..."
	docker-compose logs -f

# Test commands
test:
	@echo "Running all tests..."
	npm test --workspaces

test-unit:
	@echo "Running unit tests..."
	npm run test:unit --workspaces

test-int:
	@echo "Running integration tests..."
	npm run test:integration --workspaces

# Build commands
build:
	@echo "Building service images..."
	docker-compose build

clean:
	@echo "Cleaning build artifacts..."
	docker-compose down -v --remove-orphans
	docker system prune -f

# Deployment commands
deploy:
	@echo "Deploying to production..."
	kubectl apply -f infrastructure/kubernetes/
	kubectl rollout status deployment/authz-engine
	kubectl rollout status deployment/management-api
	kubectl rollout status deployment/audit-service

# Utility commands
status:
	@echo "Service status:"
	docker-compose ps

health:
	@echo "Checking service health..."
	curl -f http://localhost:3000/health || echo "Authz Engine: DOWN"
	curl -f http://localhost:3001/health || echo "Management API: DOWN"
	curl -f http://localhost:3002/health || echo "Audit Service: DOWN"

validate:
	@echo "Validating configuration..."
	docker-compose config

# Development workflow
dev: setup start logs

# Production-like environment
prod-up:
	@echo "Starting production-like environment..."
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	@echo "Stopping production environment..."
	docker-compose -f docker-compose.prod.yml down