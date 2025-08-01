# Development Guide

## 🛠️ Development Setup

### Local Development

1. **Start the services:**
   ```bash
   docker compose up -d --build
   ```

2. **Watch logs:**
   ```bash
   docker compose logs -f openmemory-mcp  # API logs
   docker compose logs -f openmemory-ui   # UI logs
   ```

3. **Rebuild after changes:**
   ```bash
   docker compose down && docker compose up -d --build
   ```

## 🔧 Key Modifications Made

### Backend Enhancements

#### 1. Disabled OpenAI Categorization
**File:** `api/app/utils/categorization.py`
- Modified `get_categories_for_memory()` to return empty list
- Maintains function signature for compatibility
- Eliminates external API dependency

#### 2. Enhanced User Management  
**File:** `api/app/routers/memories.py`
- Auto-creates users when they don't exist
- Added proper user relationships with `joinedload(Memory.user)`
- Fixed MCP integration with `infer=False` parameter

#### 3. Database Schema Updates
**File:** `api/app/models.py`
- Added `memories = relationship("Memory", back_populates="user")` to User model
- Enhanced Memory model with user relationship
- Proper foreign key constraints

### Frontend Enhancements

#### 1. Multi-User State Management
**File:** `ui/store/profileSlice.ts`
- Enhanced Redux state to handle multiple users
- Pre-configured users: research-lab, opti, piper, d
- User switching functionality

#### 2. UserSwitcher Component
**File:** `ui/components/shared/UserSwitcher.tsx`
- Beautiful dropdown with colored avatars
- Smooth user switching
- Persistent user selection

#### 3. Dynamic UI Updates
**File:** `ui/app/memories/components/MemoryTable.tsx`
- Added "Created By" column showing memory creators
- Color-coded user avatars
- Proper user isolation display

## 🚀 API Endpoints

### Memory Management
- `POST /api/v1/memories/filter` - Retrieve memories (main endpoint)
- `POST /api/v1/memories/` - Create new memory
- `GET /api/v1/memories/{id}` - Get specific memory
- `DELETE /api/v1/memories/` - Delete memories

### User Management
- Users are auto-created when first memory is stored
- No explicit user creation endpoint needed

### MCP Integration
- `GET /mcp/{client}/sse/{user_id}` - MCP server endpoint
- `POST /mcp/messages/` - MCP message handling

## 🔍 Debugging

### Common Issues

1. **"Internal Server Error" on API calls**
   - Check if database relationships are properly defined
   - Verify `joinedload(Memory.user)` is added to queries

2. **MCP memories not appearing in UI**
   - Ensure `infer=False` is set in MCP server
   - Check database sync in logs

3. **User switching not working**
   - Verify Redux state is properly updated
   - Check UserSwitcher component integration

### Log Analysis
```bash
# API errors
docker compose logs openmemory-mcp | grep -i error

# User operations
docker compose logs openmemory-mcp | grep -i "user\|memory"

# MCP specific
docker compose logs openmemory-mcp | grep -i "mcp\|debug"
```

## 📊 Architecture Deep Dive

### Data Flow
1. **Memory Storage**: UI → API → SQL Database + Qdrant Vector Store
2. **Memory Retrieval**: UI → API → SQL Database (with user filtering)
3. **MCP Integration**: Claude → MCP Server → Qdrant + SQL Database
4. **User Switching**: UI State Change → API Filter Update → New Memory Set

### Database Schema
- **Users**: `id`, `user_id`, `name`, `email`, `created_at`
- **Memories**: `id`, `user_id`, `app_id`, `content`, `state`, `created_at`
- **Apps**: `id`, `name`, `owner_id`, `is_active`
- **Relationships**: User ↔ Memories, App ↔ Memories

### Security Model
- **User Isolation**: All queries filtered by `user_id`
- **No Cross-User Access**: Users only see their own memories
- **Auto-User Creation**: New users created seamlessly
- **Local Data**: No external API calls for core functionality

## 🎯 Extension Points

### Adding New Users
1. Add to `defaultUsers` array in `profileSlice.ts`
2. Rebuild UI container
3. User will be auto-created on first memory

### Custom Features
- **Backup/Restore**: Extend API with export/import endpoints
- **Advanced Search**: Enhance Qdrant integration
- **Permissions**: Add role-based access control
- **Analytics**: Add memory usage statistics

### Performance Optimization
- **Query Optimization**: Add database indexes for frequent queries
- **Caching**: Implement Redis for API responses
- **Pagination**: Already implemented with FastAPI-pagination
- **Vector Search**: Optimize Qdrant collection settings
