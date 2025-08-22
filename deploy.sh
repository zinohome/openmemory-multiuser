#!/bin/bash
# OpenMemory Deployment Script
# This script ensures proper environment variable injection during build

echo "🚀 OpenMemory Deployment Script"
echo "================================"

# Configuration
API_URL="http://mem-lab.duckdns.org:8765"
USER_ID="research-lab"

echo "📋 Configuration:"
echo "  API URL: $API_URL"
echo "  User ID: $USER_ID"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Clean up old builds (optional, uncomment if needed)
# echo "🧹 Cleaning up old builds..."
# docker system prune -f

# Build and start services with proper build args
echo "🔨 Building services with environment variables..."
NEXT_PUBLIC_API_URL=$API_URL \
NEXT_PUBLIC_USER_ID=$USER_ID \
docker compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "✅ Checking service status..."
docker compose ps

# Show logs for UI service to verify environment variables
echo ""
echo "📝 UI Service Build Info:"
docker logs openmemory-ui 2>&1 | grep -E "(NEXT_PUBLIC|Building|Compiled|Ready)" | head -20

# Test API endpoint
echo ""
echo "🧪 Testing API endpoint..."
curl -s http://localhost:8765/health | jq . || echo "API health check failed"

# Show access URLs
echo ""
echo "🌐 Access URLs:"
echo "  Web UI: http://mem-lab.duckdns.org:3000"
echo "  API Docs: http://mem-lab.duckdns.org:8765/docs"
echo ""
echo "🔑 Test Credentials:"
echo "  API Key: mem_lab_v26fp933sg61"
echo "  User: opti"
echo ""
echo "✨ Deployment complete!"