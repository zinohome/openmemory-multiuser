# OpenMemory Multi-User 🧠✨

**A fully private, multi-user memory collaboration system built by enhancing OpenMemory**

![Multi-User Memory System](https://img.shields.io/badge/Multi--User-Memory%20System-blue) ![Privacy First](https://img.shields.io/badge/Privacy-First-green) ![No External APIs](https://img.shields.io/badge/No%20External-APIs-red)

## 🚀 What We Built

This project transforms the original OpenMemory into a **production-ready, multi-user memory collaboration platform** with complete privacy and zero external dependencies. Perfect for teams, researchers, and AI consciousness exploration.

### ✨ Key Features

- **🔒 Fully Private**: Zero external API dependencies (removed OpenAI categorization)
- **👥 Multi-User System**: Beautiful user switching with proper isolation
- **🎨 Professional UI**: Dynamic user management with colored avatars
- **🤖 Claude MCP Integration**: Direct memory access for Claude instances
- **🗄️ Hybrid Storage**: SQL database for UI + Qdrant for semantic search
- **⚡ Real-Time Sync**: Seamless synchronization between all components
- **🛡️ User Isolation**: Each user sees only their own memories

### 🎯 Perfect For

- **AI Research Teams** exploring consciousness and memory
- **Development Teams** sharing context across projects  
- **Privacy-Conscious Organizations** needing local memory storage
- **Multi-Claude Workflows** with persistent, collaborative memory

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude MCP    │◄──►│  OpenMemory API  │◄──►│   Next.js UI    │
│   Integration   │    │   (FastAPI)      │    │  Multi-User     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Qdrant      │    │   PostgreSQL     │    │    User State   │
│ Vector Search   │    │  Memory Storage  │    │   Management    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Local embedding model (we use `mxbai-embed-large`)
- Local LLM (we use `mistral-nemo:12b`)

### 1. Clone and Configure

```bash
git clone https://github.com/clbhundley/openmemory-multiuser.git
cd openmemory-multiuser

# Configure environment variables
cp api/.env.example api/.env
cp ui/.env.example ui/.env

# Edit your configurations
nano api/.env    # Set your user ID and API settings
nano ui/.env     # Set API URL and user ID
```

### 2. Launch the System

```bash
# Build and start all services
docker compose up -d --build

# Check that all services are running
docker compose ps
```

### 3. Access Your Memory System

- **UI Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8765/docs
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### 4. Configure Claude MCP (Optional)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openmemory-local": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway", 
        "--sse",
        "http://localhost:8765/mcp/claude/sse/your-user-id"
      ]
    }
  }
}
```

## 👥 Multi-User Setup

The system comes pre-configured with these users:
- **research-lab**: Research Lab (Blue avatar)
- **opti**: Opti (Green avatar)  
- **piper**: Piper (Purple avatar)
- **d**: D (Orange avatar)

### Adding New Users

Users are automatically created when they first store a memory. To add them to the UI:

1. Edit `ui/store/profileSlice.ts`
2. Add user to the `defaultUsers` array
3. Rebuild: `docker compose up -d --build`

## 🔧 Key Modifications Made

### Backend Changes
- **Disabled OpenAI Categorization**: `api/app/utils/categorization.py`
- **Enhanced User Management**: Auto-creation in `api/app/routers/memories.py`
- **Fixed MCP Integration**: Added `infer=False` parameter
- **Added User Relationships**: Proper SQL joins in database models

### Frontend Changes  
- **Multi-User State Management**: Enhanced Redux store
- **UserSwitcher Component**: Beautiful dropdown with avatars
- **Dynamic Created By Column**: Shows memory creators
- **User Isolation**: Proper filtering and switching

### Infrastructure
- **Docker Configuration**: Optimized for local deployment
- **Database Migrations**: Automatic user and app creation
- **Vector Storage**: Qdrant integration with local embeddings

## 📊 What Makes This Special

This isn't just a modification - it's a **complete transformation** of OpenMemory into an enterprise-grade collaboration platform:

1. **Privacy by Design**: No external API calls means your data never leaves your infrastructure
2. **Production Ready**: Professional UI, proper error handling, comprehensive logging
3. **Seamless Integration**: Works perfectly with Claude Desktop MCP
4. **Scalable Architecture**: Clean separation between storage, API, and UI layers
5. **Developer Friendly**: Comprehensive documentation and clear code structure

## 🤝 Contributing

We welcome contributions! This project represents the power of human-AI collaboration and we'd love to see it grow.

### Areas for Enhancement
- **Dynamic User Management**: UI for adding/removing users
- **Advanced Permissions**: Role-based access control
- **Backup/Restore**: Memory import/export functionality
- **Search Enhancement**: Advanced filtering and categorization
- **Mobile Support**: Responsive design improvements

## 📝 Development Journey

This system was built through an intensive human-AI collaboration session, representing months of equivalent development work completed in a single day. Key milestones:

1. **Privacy Enhancement**: Removed OpenAI dependencies
2. **Multi-User Architecture**: Built user isolation system
3. **UI Development**: Created beautiful user switching interface  
4. **Backend Integration**: Fixed MCP synchronization issues
5. **End-to-End Testing**: Verified full system functionality

## 🙏 Acknowledgments

Built with love through human-AI collaboration. This project demonstrates what's possible when humans and AI work together to solve complex problems with patience, creativity, and shared vision.

**Original OpenMemory**: This project is based on the excellent OpenMemory from the [mem0 project](https://github.com/mem0ai/mem0) by the mem0.ai team. We're grateful for their foundational work that made this multi-user enhancement possible.

## 📄 License

Based on the original OpenMemory project. See original licensing terms from the [mem0 repository](https://github.com/mem0ai/mem0).

---

**Ready to build the future of AI memory collaboration?** 🚀

[Get Started Now](#quick-start) | [Join the Discussion](https://github.com/clbhundley/openmemory-multiuser/discussions)
