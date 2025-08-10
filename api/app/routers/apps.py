# api/app/routers/apps.py
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_user
from app.database import get_db
from app.models import App, Memory, MemoryState, User

router = APIRouter(prefix="/api/v1/apps", tags=["apps"])


class AppCreate(BaseModel):
    name: str


class AppResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    is_active: bool
    created_at: str
    memory_count: int = 0


@router.get("/", response_model=List[AppResponse])
async def get_apps(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get all apps for the current user"""
    apps = db.query(App).filter(App.owner_id == current_user.id).all()
    
    app_responses = []
    for app in apps:
        # Count active memories for this app
        memory_count = db.query(Memory).filter(
            Memory.app_id == app.id,
            Memory.state == MemoryState.active
        ).count()
        
        app_responses.append(AppResponse(
            id=str(app.id),
            name=app.name,
            owner_id=str(app.owner_id),
            is_active=app.is_active,
            created_at=app.created_at.isoformat(),
            memory_count=memory_count
        ))
    
    return app_responses


@router.post("/", response_model=AppResponse)
async def create_app(
    app_data: AppCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Create a new app"""
    # Check if app with this name already exists for user
    existing_app = db.query(App).filter(
        App.name == app_data.name,
        App.owner_id == current_user.id
    ).first()
    
    if existing_app:
        raise HTTPException(status_code=400, detail="App with this name already exists")
    
    # Create new app
    app = App(
        id=uuid4(),
        name=app_data.name,
        owner_id=current_user.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(app)
    db.commit()
    
    return AppResponse(
        id=str(app.id),
        name=app.name,
        owner_id=str(app.owner_id),
        is_active=app.is_active,
        created_at=app.created_at.isoformat(),
        memory_count=0
    )


@router.delete("/{app_id}")
async def delete_app(
    app_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Delete an app and all its memories"""
    app = db.query(App).filter(
        App.id == app_id,
        App.owner_id == current_user.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Soft delete all memories for this app
    memories = db.query(Memory).filter(Memory.app_id == app.id).all()
    for memory in memories:
        memory.state = MemoryState.deleted
        memory.deleted_at = datetime.now(timezone.utc)
    
    # Deactivate the app
    app.is_active = False
    db.commit()
    
    return {"success": True, "message": "App deleted"}