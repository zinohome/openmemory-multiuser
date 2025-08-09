# api/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.auth import (
    get_current_user,
    require_user,
    validate_api_key,
    create_user_with_api_key
)
from app.database import get_db
from app.models import User


router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    api_key: str


class LoginResponse(BaseModel):
    success: bool
    user_id: str
    name: str
    message: str


class ValidateResponse(BaseModel):
    valid: bool
    user_id: Optional[str] = None
    name: Optional[str] = None


class CurrentUserResponse(BaseModel):
    user_id: str
    name: str
    email: Optional[str]
    created_at: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Validate API key and return user info"""
    user = validate_api_key(request.api_key, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return LoginResponse(
        success=True,
        user_id=user.user_id,
        name=user.name or user.user_id,
        message="Login successful"
    )


@router.post("/validate", response_model=ValidateResponse)
def validate(request: LoginRequest, db: Session = Depends(get_db)):
    """Check if an API key is valid without full login"""
    user = validate_api_key(request.api_key, db)
    
    if not user:
        return ValidateResponse(valid=False)
    
    return ValidateResponse(
        valid=True,
        user_id=user.user_id,
        name=user.name or user.user_id
    )


@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user: User = Depends(require_user)):
    """Get current authenticated user info"""
    return CurrentUserResponse(
        user_id=current_user.user_id,
        name=current_user.name or current_user.user_id,
        email=current_user.email,
        created_at=current_user.created_at.isoformat()
    )


@router.post("/logout")
def logout(response: Response):
    """Clear session (for web UI)"""
    # This would typically clear cookies/session storage
    # Since we're using session storage on the frontend, this is mostly symbolic
    response.status_code = 200
    return {"success": True, "message": "Logged out successfully"}