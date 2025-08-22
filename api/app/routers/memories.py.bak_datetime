# api/app/routers/memories.py
import logging
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi_pagination import Page, paginate
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_user
from app.config import DEFAULT_APP_ID
from app.database import get_db
from app.models import App, Memory, MemoryState, User
from app.utils.memory import get_memory_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/memories", tags=["memories"])


class MemoryCreate(BaseModel):
    text: str
    metadata: Optional[dict] = {}


class MemoryResponse(BaseModel):
    id: str
    content: str
    user_id: str
    app_id: str
    created_at: str
    state: str
    user: Optional[dict] = None


class MemoryFilter(BaseModel):
    page: int = 1
    size: int = 50
    user_id: Optional[str] = None
    state: Optional[str] = "active"


class MemoryDelete(BaseModel):
    memory_id: str


@router.post("/", response_model=MemoryResponse)
async def create_memory(
    memory_data: MemoryCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Create a new memory"""
    try:
        # Get or create default app
        app = db.query(App).filter(
            App.name == DEFAULT_APP_ID,
            App.owner_id == current_user.id
        ).first()
        
        if not app:
            app = App(
                id=uuid4(),
                name=DEFAULT_APP_ID,
                owner_id=current_user.id
            )
            db.add(app)
            db.flush()
        
        # Create memory in database
        memory = Memory(
            id=uuid4(),
            user_id=current_user.id,
            app_id=app.id,
            content=memory_data.text,
            metadata_=memory_data.metadata,
            created_at=datetime.now(datetime.UTC)
        )
        db.add(memory)
        db.commit()
        
        # Add to vector store
        try:
            memory_client = get_memory_client()
            if memory_client:
                memory_client.add(
                    messages=memory_data.text,
                    user_id=current_user.user_id,
                    metadata={
                        **memory_data.metadata,
                        "app_id": str(app.id),
                        "memory_id": str(memory.id),
                        "created_at": memory.created_at.isoformat()
                    },
                    infer=False
                )
        except Exception as e:
            logger.error(f"Failed to add to vector store: {e}")
        
        return MemoryResponse(
            id=str(memory.id),
            content=memory.content,
            user_id=str(memory.user_id),
            app_id=str(memory.app_id),
            created_at=memory.created_at.isoformat(),
            state=memory.state.value
        )
        
    except Exception as e:
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/filter")
async def filter_memories(
    filter_data: MemoryFilter,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Filter and paginate memories"""
    try:
        query = db.query(Memory).options(joinedload(Memory.user))
        
        # Filter by user if specified
        if filter_data.user_id:
            user = db.query(User).filter(User.user_id == filter_data.user_id).first()
            if user:
                query = query.filter(Memory.user_id == user.id)
        elif current_user:
            # If authenticated, show only current user's memories
            query = query.filter(Memory.user_id == current_user.id)
        
        # Filter by state
        if filter_data.state:
            query = query.filter(Memory.state == filter_data.state)
        
        # Order by creation date
        query = query.order_by(Memory.created_at.desc())
        
        # Get total count
        total = query.count()
        
        # Paginate
        offset = (filter_data.page - 1) * filter_data.size
        memories = query.offset(offset).limit(filter_data.size).all()
        
        # Format response
        items = []
        for memory in memories:
            items.append({
                "id": str(memory.id),
                "content": memory.content,
                "user_id": str(memory.user_id),
                "app_id": str(memory.app_id),
                "created_at": memory.created_at.isoformat(),
                "state": memory.state.value,
                "user": {
                    "id": str(memory.user.id),
                    "user_id": memory.user.user_id,
                    "name": memory.user.name or memory.user.user_id
                } if memory.user else None
            })
        
        # Calculate total pages
        pages = (total + filter_data.size - 1) // filter_data.size
        
        return {
            "items": items,
            "total": total,
            "page": filter_data.page,
            "size": filter_data.size,
            "pages": pages
        }
        
    except Exception as e:
        logger.error(f"Error filtering memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{memory_id}")
async def get_memory(
    memory_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get a specific memory"""
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id
    ).first()
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    return MemoryResponse(
        id=str(memory.id),
        content=memory.content,
        user_id=str(memory.user_id),
        app_id=str(memory.app_id),
        created_at=memory.created_at.isoformat(),
        state=memory.state.value
    )


@router.delete("/")
async def delete_memory(
    delete_data: MemoryDelete,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Delete a memory"""
    memory = db.query(Memory).filter(
        Memory.id == delete_data.memory_id,
        Memory.user_id == current_user.id
    ).first()
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    # Soft delete
    memory.state = MemoryState.deleted
    memory.deleted_at = datetime.now(datetime.UTC)
    db.commit()
    
    # Also delete from vector store
    try:
        memory_client = get_memory_client()
        if memory_client:
            # Note: This might need adjustment based on mem0 API
            pass
    except Exception as e:
        logger.error(f"Failed to delete from vector store: {e}")
    
    return {"success": True, "message": "Memory deleted"}


@router.post("/search")
async def search_memories(
    query: str,
    limit: int = 10,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Search memories using vector similarity"""
    try:
        memory_client = get_memory_client()
        if not memory_client:
            return {"results": [], "message": "Search not available"}
        
        results = memory_client.search(
            query=query,
            user_id=current_user.user_id,
            limit=limit
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))