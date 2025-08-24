# api/main.py
import datetime
from uuid import uuid4

from app.config import USER_ID  # Removed DEFAULT_APP_ID import
from app.database import Base, SessionLocal, engine
from app.mcp_server import setup_mcp_server
from app.models import App, User
from app.routers import apps_router, config_router, memories_router, stats_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination

app = FastAPI(
    title="OpenMemory API",
    description="Multi-user collaborative memory system",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables
Base.metadata.create_all(bind=engine)

# Note: Default user creation removed - users now created on demand with API keys

# Setup MCP server
setup_mcp_server(app)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(memories_router)
app.include_router(apps_router)
app.include_router(stats_router)
app.include_router(config_router)

# Add pagination support
add_pagination(app)

@app.get("/")
async def root():
    return {
        "name": "OpenMemory Multi-User API",
        "status": "online",
        "version": "2.0.0",
        "features": [
            "Multi-user support",
            "API key authentication",
            "Dynamic user creation",
            "Collaborative memory storage"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
