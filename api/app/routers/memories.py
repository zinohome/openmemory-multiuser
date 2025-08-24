# api/app/routers/memories.py
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_pagination import Page, paginate
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_user
# Removed DEFAULT_APP_ID import - using "default" directly
from app.database import get_db
from app.models import App, Memory, MemoryState, User
from app.utils.memory import get_memory_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/memories", tags=["memories"])


class MemoryCreate(BaseModel):
    text: str
    metadata: Optional[Dict] = None


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict] = None
    state: Optional[MemoryState] = None


class MemoryFilter(BaseModel):
    user_id: Optional[str] = None
    state: Optional[MemoryState] = None
    page: int = 1
    size: int = 50


class MemoryResponse(BaseModel):
    id: str
    content: str
    user_id: str
    app_id: str
    metadata: Dict
    state: str
    created_at: str
    updated_at: str
    
    # Include user info for display
    user: Optional[Dict] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=MemoryResponse)
async def create_memory(
    memory_data: MemoryCreate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Create a new memory"""
    try:
        # Get or create default app - using "default" directly instead of DEFAULT_APP_ID
        app = db.query(App).filter(
            App.name == "default",
            App.owner_id == current_user.id
        ).first()
        
        if not app:
            app = App(
                id=uuid4(),
                name="default",
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
            metadata_=memory_data.metadata or {},
            created_at=datetime.now(timezone.utc)
        )
        db.add(memory)
        
        # Try to add to vector store
        try:
            memory_client = get_memory_client()
            if memory_client:
                memory_client.add(
                    messages=[{"role": "user", "content": memory_data.text}],
                    user_id=current_user.user_id,
                    metadata={
                        "app_id": str(app.id),
                        **(memory_data.metadata or {})
                    },
                    infer=False  # Fixed: Added infer=False parameter
                )
                logger.info(f"Added memory to vector store for user {current_user.user_id}")
        except Exception as e:
            logger.warning(f"Failed to add to vector store: {e}")
            # Continue anyway - database entry was successful
        
        db.commit()
        db.refresh(memory)
        
        # Prepare response
        memory_dict = {
            "id": str(memory.id),
            "content": memory.content,
            "user_id": str(memory.user_id),
            "app_id": str(memory.app_id),
            "metadata": memory.metadata_,
            "state": memory.state.value,
            "created_at": memory.created_at.isoformat(),
            "updated_at": memory.updated_at.isoformat(),
            "user": {
                "id": str(current_user.id),
                "user_id": current_user.user_id,
                "name": current_user.name or current_user.user_id
            }
        }
        
        return MemoryResponse(**memory_dict)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating memory: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create memory: {str(e)}")


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
        
        # Filter by state (default to active)
        if filter_data.state:
            query = query.filter(Memory.state == filter_data.state)
        else:
            query = query.filter(Memory.state == MemoryState.active)
        
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
            memory_dict = {
                "id": str(memory.id),
                "content": memory.content,
                "user_id": str(memory.user_id),
                "app_id": str(memory.app_id),
                "metadata": memory.metadata_,
                "state": memory.state.value,
                "created_at": memory.created_at.isoformat(),
                "updated_at": memory.updated_at.isoformat(),
                "user": {
                    "id": str(memory.user.id),
                    "user_id": memory.user.user_id,
                    "name": memory.user.name or memory.user.user_id
                } if memory.user else None
            }
            items.append(memory_dict)
        
        # Calculate total pages
        pages = (total + filter_data.size - 1) // filter_data.size
        
        # Return response in expected format
        return {
            "items": items,
            "total": total,
            "page": filter_data.page,
            "size": filter_data.size,
            "pages": pages
        }
        
    except Exception as e:
        logger.error(f"Error filtering memories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to filter memories: {str(e)}")


@router.get("/", response_model=Page[MemoryResponse])
async def get_memories(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
    state: Optional[MemoryState] = Query(None),
    search: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100)
):
    """Get memories for the current user with filtering and pagination"""
    try:
        # Build query
        query = db.query(Memory).options(joinedload(Memory.user)).filter(
            Memory.user_id == current_user.id
        )
        
        # Apply filters
        if state:
            query = query.filter(Memory.state == state)
        
        if app_id:
            query = query.filter(Memory.app_id == app_id)
            
        if search:
            query = query.filter(Memory.content.ilike(f"%{search}%"))
        
        # Order by created_at desc
        query = query.order_by(Memory.created_at.desc())
        
        # Get all results for pagination
        memories = query.all()
        
        # Convert to response format
        memory_responses = []
        for memory in memories:
            memory_dict = {
                "id": str(memory.id),
                "content": memory.content,
                "user_id": str(memory.user_id),
                "app_id": str(memory.app_id),
                "metadata": memory.metadata_,
                "state": memory.state.value,
                "created_at": memory.created_at.isoformat(),
                "updated_at": memory.updated_at.isoformat(),
                "user": {
                    "id": str(memory.user.id),
                    "user_id": memory.user.user_id,
                    "name": memory.user.name or memory.user.user_id
                } if memory.user else None
            }
            memory_responses.append(MemoryResponse(**memory_dict))
        
        return paginate(memory_responses, page=page, size=size)
        
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get memories: {str(e)}")


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get a specific memory"""
    try:
        memory = db.query(Memory).options(joinedload(Memory.user)).filter(
            Memory.id == memory_id,
            Memory.user_id == current_user.id
        ).first()
        
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        
        memory_dict = {
            "id": str(memory.id),
            "content": memory.content,
            "user_id": str(memory.user_id),
            "app_id": str(memory.app_id),
            "metadata": memory.metadata_,
            "state": memory.state.value,
            "created_at": memory.created_at.isoformat(),
            "updated_at": memory.updated_at.isoformat(),
            "user": {
                "id": str(memory.user.id),
                "user_id": memory.user.user_id,
                "name": memory.user.name or memory.user.user_id
            } if memory.user else None
        }
        
        return MemoryResponse(**memory_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get memory: {str(e)}")


@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: str,
    memory_update: MemoryUpdate,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Update a memory"""
    try:
        memory = db.query(Memory).filter(
            Memory.id == memory_id,
            Memory.user_id == current_user.id
        ).first()
        
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        
        # Update fields if provided
        if memory_update.content is not None:
            memory.content = memory_update.content
        if memory_update.metadata is not None:
            memory.metadata_ = memory_update.metadata
        if memory_update.state is not None:
            memory.state = memory_update.state
            
        memory.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(memory)
        
        # Get user info for response
        user = db.query(User).filter(User.id == memory.user_id).first()
        
        memory_dict = {
            "id": str(memory.id),
            "content": memory.content,
            "user_id": str(memory.user_id),
            "app_id": str(memory.app_id),
            "metadata": memory.metadata_,
            "state": memory.state.value,
            "created_at": memory.created_at.isoformat(),
            "updated_at": memory.updated_at.isoformat(),
            "user": {
                "id": str(user.id),
                "user_id": user.user_id,
                "name": user.name or user.user_id
            } if user else None
        }
        
        return MemoryResponse(**memory_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update memory: {str(e)}")


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Delete a memory"""
    try:
        memory = db.query(Memory).filter(
            Memory.id == memory_id,
            Memory.user_id == current_user.id
        ).first()
        
        if not memory:
            raise HTTPException(status_code=404, detail="Memory not found")
        
        # Soft delete - set state to deleted
        memory.state = MemoryState.deleted
        memory.deleted_at = datetime.now(timezone.utc)
        memory.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {"message": "Memory deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete memory: {str(e)}")


class BulkDeleteRequest(BaseModel):
    memory_id: Optional[str] = None  # For single delete via POST
    memory_ids: Optional[List[str]] = None  # For bulk delete


@router.delete("/")
async def delete_memories_bulk(
    delete_request: BulkDeleteRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Delete memories (supports both single and bulk delete for UI compatibility)"""
    try:
        memory_ids = []
        
        # Handle single memory delete
        if delete_request.memory_id:
            memory_ids = [delete_request.memory_id]
        # Handle bulk delete
        elif delete_request.memory_ids:
            memory_ids = delete_request.memory_ids
        else:
            raise HTTPException(status_code=400, detail="No memory IDs provided")
        
        # Find and delete memories
        updated_count = 0
        for memory_id in memory_ids:
            memory = db.query(Memory).filter(
                Memory.id == memory_id,
                Memory.user_id == current_user.id
            ).first()
            
            if memory:
                # Soft delete - set state to deleted
                memory.state = MemoryState.deleted
                memory.deleted_at = datetime.now(timezone.utc)
                memory.updated_at = datetime.now(timezone.utc)
                updated_count += 1
        
        db.commit()
        
        if updated_count == 0:
            raise HTTPException(status_code=404, detail="No memories found to delete")
        
        return {"message": f"{updated_count} memories deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting memories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete memories: {str(e)}")


@router.post("/search")
async def search_memories(
    query: str,
    current_user: User = Depends(require_user),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Search memories using vector similarity"""
    try:
        # Try vector search first
        memory_client = get_memory_client()
        if memory_client:
            try:
                results = memory_client.search(
                    query=query,
                    user_id=current_user.user_id,
                    limit=limit
                )
                
                return {
                    "query": query,
                    "results": results,
                    "method": "vector_search"
                }
            except Exception as e:
                logger.warning(f"Vector search failed: {e}")
        
        # Fallback to database search
        memories = db.query(Memory).options(joinedload(Memory.user)).filter(
            Memory.user_id == current_user.id,
            Memory.content.ilike(f"%{query}%"),
            Memory.state == MemoryState.active
        ).limit(limit).all()
        
        results = []
        for memory in memories:
            results.append({
                "id": str(memory.id),
                "memory": memory.content,  # Keep as 'memory' for compatibility with vector search
                "content": memory.content,
                "created_at": memory.created_at.isoformat(),
                "metadata": memory.metadata_,
                "score": 0.5  # Default relevance score for text search
            })
        
        return {
            "query": query,
            "results": results,
            "method": "database_search"
        }
        
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search memories: {str(e)}")
