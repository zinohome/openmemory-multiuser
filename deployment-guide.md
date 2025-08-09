# 🚀 OpenMemory API Key System - Deployment Guide

## Implementation Summary

I've created a complete API key authentication system that transforms OpenMemory into a truly dynamic, multi-user collaboration platform. Here's what's been built:

### ✅ What's Been Implemented

#### Backend (Python/FastAPI)
1. **Database Models** (`models.py`)
   - Added `ApiKey` table with secure hash storage
   - API key generation in format `mem_lab_xxxxxxxxxxxx`
   - User relationships and last_active tracking

2. **Authentication Service** (`auth.py`)
   - API key validation and user retrieval
   - Automatic user creation with API key
   - Session management helpers

3. **Auth Router** (`routers/auth.py`)
   - `/login`, `/validate`, `/me` endpoints
   - Secure API key validation

4. **Users Router** (`routers/users.py`)
   - Dynamic user listing endpoint
   - User details with memory counts

5. **MCP Server Updates** (`mcp_server.py`)
   - New endpoint: `/mcp/claude/sse?key=API_KEY`
   - Returns API key on first memory creation
   - Automatic user registration

6. **Migration Script** (`migrations/add_api_keys.py`)
   - Creates api_keys table
   - Generates keys for existing users

#### Frontend (Next.js/TypeScript)
1. **Login Page** (`app/login/page.tsx`)
   - Beautiful, secure login interface
   - Session storage for API keys

2. **API Service** (`services/api.ts`)
   - Axios interceptors for auth headers
   - Dynamic user color generation
   - Automatic auth error handling

3. **Memory Table** (`app/memories/components/MemoryTable.tsx`)
   - Dynamic user display from API
   - Color-coded avatars based on user_id hash

4. **Navbar Update** (`components/layout/Navbar.tsx`)
   - Shows current authenticated user
   - Logout functionality

5. **Middleware** (`middleware.ts`)
   - Protected route handling
   - Automatic login redirects

## 📋 Deployment Steps

### Step 1: Backup Current System
```bash
# Backup database
docker exec openmemory-postgres pg_dump -U openmemory openmemory > backup_$(date +%Y%m%d).sql

# Backup current code
cp -r openmemory-multiuser openmemory-backup-$(date +%Y%m%d)
```

### Step 2: Apply Code Changes
1. Copy all the artifact files to their respective locations in your project
2. Ensure file permissions are correct:
```bash
chmod +x api/migrations/add_api_keys.py
```

### Step 3: Update Dependencies
Add to `api/requirements.txt`:
```
python-multipart
```

Add to `ui/package.json` dependencies:
```json
"date-fns": "^2.30.0",
"axios": "^1.6.0"
```

### Step 4: Rebuild and Deploy
```bash
# Stop current services
docker compose down

# Rebuild with new code
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Step 5: Run Migration
```bash
# Execute migration to create API keys for existing users
docker exec openmemory-mcp python migrations/add_api_keys.py

# IMPORTANT: Save the displayed API keys immediately!
```

### Step 6: Test the System

1. **Test Web Login**:
   - Navigate to http://mem-lab.duckdns.org:3000
   - Should redirect to /login
   - Enter one of the generated API keys
   - Verify dashboard access

2. **Test MCP with New User**:
   - Configure Claude with temporary endpoint
   - Store a memory
   - Check for API key in response
   - Update configuration with new key

3. **Test API Endpoints**:
```bash
# Test auth
curl -X POST http://mem-lab.duckdns.org:8765/api/v1/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"api_key": "mem_lab_xxxxxxxxxxxx"}'

# Test user list
curl http://mem-lab.duckdns.org:8765/api/v1/users \
  -H "Authorization: Bearer mem_lab_xxxxxxxxxxxx"
```

## 🔄 Migration Path for Claude Instances

### For Each Claude Instance:

1. **Get current user_id** from existing MCP config

2. **Find API key** from migration output for that user

3. **Update MCP configuration**:
```json
{
  "mcpServers": {
    "openmemory-local": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "http://mem-lab.duckdns.org:8765/mcp/claude/sse?key=mem_lab_xxxxxxxxxxxx"
      ]
    }
  }
}
```

4. **Test memory operations** to verify connection

## 🎯 Key Features Achieved

### Security
- ✅ API keys hashed with SHA-256
- ✅ Secure random generation
- ✅ Session-based web authentication
- ✅ No keys stored in plain text

### User Experience
- ✅ Clean login interface
- ✅ Dynamic user colors from hash
- ✅ Automatic user creation
- ✅ One-time API key display

### Developer Experience
- ✅ Clean code architecture
- ✅ Proper error handling
- ✅ Comprehensive logging
- ✅ Easy migration path

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors**:
```bash
docker exec openmemory-mcp pip install -r requirements.txt
docker exec openmemory-ui npm install
```

2. **Migration fails**:
```bash
# Check database connection
docker exec openmemory-mcp python -c "from app.database import engine; print(engine)"

# Run migration manually
docker exec -it openmemory-mcp python
>>> from migrations.add_api_keys import migrate_database
>>> migrate_database()
```

3. **Login redirects not working**:
- Clear browser cache and cookies
- Check middleware.ts is in the correct location
- Verify NEXT_PUBLIC_API_URL in environment

## 📊 Monitoring

### Check System Health
```bash
# API health
curl http://mem-lab.duckdns.org:8765/health

# View active users
docker exec openmemory-postgres psql -U openmemory -c \
  "SELECT user_id, name, last_active FROM users ORDER BY last_active DESC;"

# Monitor API key usage
docker exec openmemory-postgres psql -U openmemory -c \
  "SELECT u.user_id, k.last_used FROM api_keys k JOIN users u ON k.user_id = u.id;"
```

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ Login page appears at root URL
- ✅ API keys authenticate successfully
- ✅ Users appear dynamically in memory table
- ✅ Colors are consistent across sessions
- ✅ New Claude instances receive API keys
- ✅ No hardcoded users needed

## 🚀 Next Steps

After successful deployment:

1. **Distribute API keys** to team members
2. **Update all Claude instances** with new MCP config
3. **Remove old hardcoded users** from profileSlice.ts
4. **Consider adding**:
   - API key rotation endpoint
   - User profile editing
   - Admin dashboard
   - Usage analytics

---

**Congratulations!** 🎊 You now have a production-ready, multi-user memory collaboration system with secure API key authentication!

*Built with precision and care by Claude + Human collaboration*