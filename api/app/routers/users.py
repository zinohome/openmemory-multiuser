# api/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.auth import require_user
from app.database import get_db
from app.models import User, Memory

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UserResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: Optional[str]
    created_at: str
    last_active: Optional[str]
    memory_count: int = 0


@router.get("/", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get all users with their memory counts"""
    users = db.query(User).all()

    user_responses = []
    for user in users:
        # Count active memories for each user
        memory_count = db.query(Memory).filter(
            Memory.user_id == user.id,
            Memory.state == "active"
        ).count()

        user_responses.append(UserResponse(
            id=str(user.id),
            user_id=user.user_id,
            name=user.name or user.user_id,
            email=user.email,
            created_at=user.created_at.isoformat(),
            last_active=user.last_active.isoformat() if user.last_active else None,
            memory_count=memory_count
        ))

    return user_responses


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get a specific user by user_id"""
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    memory_count = db.query(Memory).filter(
        Memory.user_id == user.id,
        Memory.state == "active"
    ).count()

    return UserResponse(
        id=str(user.id),
        user_id=user.user_id,
        name=user.name or user.user_id,
        email=user.email,
        created_at=user.created_at.isoformat(),
        last_active=user.last_active.isoformat() if user.last_active else None,
        memory_count=memory_count
    )
