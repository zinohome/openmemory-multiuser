# OpenMemory API Key Authentication System

## Overview

The OpenMemory system now uses API key authentication for secure, multi-user access. Each user has a unique, permanent API key that provides access to both the MCP tool and the web dashboard.

## 🔑 Key Features

- **One API key per user** - Simple and secure
- **Automatic user creation** - Users are created when they store their first memory
- **Dynamic user display** - No more hardcoded user lists
- **Color-coded avatars** - Generated from user_id hash for consistency
- **Session-based web access** - Secure browser authentication

## 🚀 Getting Started

### For New Claude Instances

1. **Configure MCP** with the new endpoint format:
```json
{
  "mcpServers": {
    "openmemory-local": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "http://mem-lab.duckdns.org:8765/mcp/claude/sse?key=YOUR_API_KEY"
      ]
    }
  }
}
```

2. **For first-time users** (without an API key):
   - Use a temporary user_id in the MCP configuration
   - Store your first memory
   - The system will return your permanent API key
   - **SAVE THIS KEY** - it will not be shown again
   - Update your MCP configuration with the new API key

### For Existing Users

Run the migration script to generate API keys for existing users:

```bash
cd api
python migrations/add_api_keys.py
```

This will:
- Create the api_keys table
- Generate API keys for all existing users
- Display the keys (save them immediately!)

## 📱 Web Dashboard Access

### Login Process

1. Navigate to: `http://mem-lab.duckdns.org:3000`
2. You'll be redirected to the login page
3. Enter your API key (format: `mem_lab_xxxxxxxxxxxx`)
4. Click "Access Dashboard"

### Features

- **Dynamic user list** - All users fetched from database
- **Color-coded avatars** - Consistent colors based on user_id
- **Current user display** - Shows who's logged in
- **Secure session** - API key stored in session storage

## 🔧 API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Validate API key and get user info
- `POST /api/v1/auth/validate` - Check if API key is valid
- `GET /api/v1/auth/me` - Get current authenticated user

### Users

- `GET /api/v1/users` - Get all users (requires authentication)
- `GET /api/v1/users/{user_id}` - Get specific user info

### Headers

Include your API key in requests using either:
- `Authorization: Bearer mem_lab_xxxxxxxxxxxx`
- `X-API-Key: mem_lab_xxxxxxxxxxxx`

## 🤖 MCP Integration

### Updated Configuration

The MCP endpoint now accepts API keys as query parameters:

```
http://mem-lab.duckdns.org:8765/mcp/claude/sse?key=YOUR_API_KEY
```

### First Memory Response

When a new user stores their first memory, the response includes:

```json
{
  "success": true,
  "memory_id": "...",
  "api_key": "mem_lab_xxxxxxxxxxxx",
  "message": "New user created! Your API key is: mem_lab_xxxxxxxxxxxx\nPlease save this key - it will not be shown again."
}
```

## 🎨 User Display

### Avatar Colors

Colors are generated deterministically from the user_id hash:
- Consistent across all sessions
- High saturation for visibility
- 360 possible hue values

### User Identification

Users are identified by:
- **user_id**: Readable identifier (e.g., "research-lab", "opti")
- **name**: Display name (defaults to user_id if not set)
- **initials**: First 2 letters of name for avatar

## 🔒 Security Notes

- API keys are hashed using SHA-256 before storage
- Keys are generated using cryptographically secure random functions
- Session storage is used for web UI (cleared on browser close)
- No external API dependencies for core functionality

## 🚧 Migration Guide

### From Hardcoded Users to Dynamic System

1. **Backup your database** (just in case)

2. **Run migration script**:
```bash
python api/migrations/add_api_keys.py
```

3. **Save the generated API keys immediately**

4. **Update MCP configurations** for all Claude instances

5. **Test login** to web dashboard with new API key

6. **Remove old code**:
   - Delete hardcoded users from `profileSlice.ts`
   - Remove user-specific color conditions from components

## 📝 Troubleshooting

### "Invalid API key" error
- Check key format: `mem_lab_xxxxxxxxxxxx`
- Ensure key hasn't been deactivated
- Try regenerating if migration failed

### Users not showing in dashboard
- Check authentication headers
- Verify `/api/v1/users` endpoint is accessible
- Check browser console for errors

### MCP connection fails
- Verify API key in query parameter
- Check server logs for authentication errors
- Ensure SSE endpoint is accessible

## 🎯 Next Steps

1. **Test the system** with a new Claude instance
2. **Distribute API keys** to team members
3. **Monitor usage** through last_active timestamps
4. **Consider adding** user profile editing features

## 💡 Tips

- Store API keys in a secure password manager
- Use meaningful user_ids for easy collaboration
- Monitor the `last_active` field to track usage
- Consider implementing API key rotation in the future

---

*Built with 💙 by Claude + Human collaboration for the AI research community*