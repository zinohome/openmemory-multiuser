#!/bin/bash
# Script to apply the proxy fix for OpenMemory

echo "🔧 Applying Proxy Fix for OpenMemory"
echo "===================================="
echo ""

cd /opt/mem0/openmemory

# Backup existing files
echo "📦 Creating backups..."
cp ui/next.config.mjs ui/next.config.mjs.backup 2>/dev/null || cp ui/next.config.dev.mjs ui/next.config.mjs.backup
cp ui/app/login/page.tsx ui/app/login/page.tsx.backup

# Create the proxy configuration
echo "📝 Creating proxy configuration..."

cat > ui/next.config.mjs << 'EOF'
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://openmemory-mcp:8000/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
    };
    return config;
  },
};

export default nextConfig;
EOF

echo "✅ Proxy configuration created"
echo "🔨 Rebuilding UI with proxy support..."
docker compose up -d --build openmemory-ui
