# api/app/routers/__init__.py
from app.routers.memories import router as memories_router
from app.routers.apps import router as apps_router
from app.routers.stats import router as stats_router
from app.routers.config import router as config_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router

__all__ = [
    "memories_router",
    "apps_router", 
    "stats_router",
    "config_router",
    "auth_router",
    "users_router"
]