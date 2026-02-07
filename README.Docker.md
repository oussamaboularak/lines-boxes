# Docker Setup

This project is fully containerized using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 2. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001

### 3. Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Development vs Production

### Development (Current Setup)
The current `docker-compose.yml` is configured for local development with:
- Hot reload disabled (production build)
- Port mapping to localhost
- Restart policy: unless-stopped

### For Production
Consider:
- Using environment variables for configuration
- Adding a reverse proxy (nginx/traefik)
- Implementing health checks
- Using Docker secrets for sensitive data
- Setting up logging and monitoring

## Useful Commands

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild a specific service
docker-compose up -d --build backend

# Execute commands in running container
docker-compose exec backend sh
docker-compose exec frontend sh

# List running containers
docker-compose ps

# Remove all stopped containers
docker-compose rm
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Stop existing services
docker-compose down

# Check what's using the port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux

# Kill the process or change ports in docker-compose.yml
```

### Build Failures
```bash
# Clean build (no cache)
docker-compose build --no-cache

# Remove all Docker images and rebuild
docker system prune -a
docker-compose up --build
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Inspect container
docker inspect game-backend
```

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Nginx:80)    │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│   Backend       │
│   (Node:3001)   │
└─────────────────┘
```

## File Structure

```
game/
├── docker-compose.yml          # Orchestration
├── .dockerignore              # Root ignore
├── backend/
│   ├── Dockerfile            # Backend image
│   ├── .dockerignore        # Backend ignore
│   └── ...
├── frontend/
│   ├── Dockerfile           # Frontend image
│   ├── nginx.conf          # Nginx config
│   ├── .dockerignore       # Frontend ignore
│   └── ...
└── shared/
    └── types.ts            # Shared types
```
