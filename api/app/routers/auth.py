# api/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import re

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


class RegisterRequest(BaseModel):
    user_id: str
    display_name: str


class RegisterResponse(BaseModel):
    success: bool
    user_id: str
    name: str
    api_key: str
    message: str
    mcp_config: dict


class ValidateResponse(BaseModel):
    valid: bool
    user_id: Optional[str] = None
    name: Optional[str] = None


class CurrentUserResponse(BaseModel):
    user_id: str
    name: str
    email: Optional[str]
    created_at: str


def validate_username(username: str) -> bool:
    """Validate username format: lowercase, alphanumeric, underscores, 3-20 chars"""
    return bool(re.match(r'^[a-z][a-z0-9_]{2,19}$', username))


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


@router.post("/register", response_model=RegisterResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with username and display name"""
    
    # Validate username format
    if not validate_username(request.user_id):
        raise HTTPException(
            status_code=400, 
            detail="Username must be lowercase, start with a letter, and be 3-20 characters (letters, numbers, underscores only)"
        )
    
    # Validate display name
    if not request.display_name or len(request.display_name.strip()) < 1:
        raise HTTPException(status_code=400, detail="Display name is required")
    
    if len(request.display_name.strip()) > 50:
        raise HTTPException(status_code=400, detail="Display name must be 50 characters or less")
    
    try:
        # Create user with API key
        user, api_key = create_user_with_api_key(
            user_id=request.user_id,
            db=db,
            name=request.display_name.strip()
        )
        
        # Generate MCP configuration
        mcp_config = {
            "mcpServers": {
                "openmemory": {
                    "command": "npx",
                    "args": [
                        "-y",
                        "supergateway",
                        "--sse",
                        "http://192.168.66.163:8765/mcp/claude/sse",
                        "--oauth2Bearer",
                        api_key
                    ]
                }
            }
        }
        
        return RegisterResponse(
            success=True,
            user_id=user.user_id,
            name=user.name,
            api_key=api_key,
            message=f"Account created successfully for {user.name}",
            mcp_config=mcp_config
        )
        
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=409, detail=f"Username '{request.user_id}' is already taken")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


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
