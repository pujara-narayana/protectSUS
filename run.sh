#!/bin/bash

# ProtectSUS Startup Script

set -e

echo "🚀 Starting ProtectSUS..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.example to .env and configure your credentials"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "🐳 Please start Docker Desktop and try again"
    exit 1
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check API health
echo "🏥 Checking API health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is healthy!"
else
    echo "⚠️  API health check failed, but services are running"
    echo "📋 Check logs with: docker-compose logs -f api"
fi

echo ""
echo "✅ ProtectSUS is running!"
echo ""
echo "📡 API:          http://localhost:8000"
echo "📚 API Docs:     http://localhost:8000/docs"
echo "🏥 Health Check: http://localhost:8000/health"
echo ""
echo "📋 View logs:    docker-compose logs -f"
echo "🛑 Stop:         docker-compose down"
echo ""
