# api/app/auth.py
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import uuid4

from fastapi import Depends, HTTPException, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ApiKey, App, generate_api_key, hash_api_key


class APIKeyAuth(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(APIKeyAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        # Try to get API key from Authorization header
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            if credentials.scheme != "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme")
            return credentials.credentials
        
        # Try to get API key from X-API-Key header
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return api_key
        
        if self.auto_error:
            raise HTTPException(status_code=403, detail="API Key required")
        return None


api_key_auth = APIKeyAuth(auto_error=False)


def get_current_user(
    api_key: Optional[str] = Depends(api_key_auth),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user from API key"""
    if not api_key:
        return None
    
    # Hash the provided key to compare with stored hash
    key_hash = hash_api_key(api_key)
    
    # Find the API key in database
    api_key_obj = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True
    ).first()
    
    if not api_key_obj:
        return None
    
    # Update last used timestamp
    api_key_obj.last_used = datetime.now(timezone.utc)
    api_key_obj.user.last_active = datetime.now(timezone.utc)
    db.commit()
    
    return api_key_obj.user


def require_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """Require authenticated user"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return current_user


def create_user_with_api_key(
    user_id: str,
    db: Session,
    name: Optional[str] = None,
    email: Optional[str] = None
) -> Tuple[User, str]:
    """Create a new user with API key, returns (user, api_key)"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.user_id == user_id).first()
    if existing_user:
        # Check if they have an API key
        if existing_user.api_key:
            raise ValueError(f"User {user_id} already exists with an API key")
        
        # Generate API key for existing user
        api_key = generate_api_key()
        api_key_obj = ApiKey(
            user_id=existing_user.id,
            key_hash=hash_api_key(api_key)
        )
        db.add(api_key_obj)
        db.commit()
        return existing_user, api_key
    
    # Create new user
    user = User(
        id=uuid4(),
        user_id=user_id,
        name=name or user_id.title(),
        email=email
    )
    db.add(user)
    db.flush()  # Get the user ID
    
    # Generate API key
    api_key = generate_api_key()
    api_key_obj = ApiKey(
        user_id=user.id,
        key_hash=hash_api_key(api_key)
    )
    db.add(api_key_obj)
    
    # Create default app for the user
    default_app = App(
        id=uuid4(),
        name="default",
        owner_id=user.id
    )
    db.add(default_app)
    
    db.commit()
    
    return user, api_key


def get_or_create_user_with_api_key(
    user_id: str,
    db: Session
) -> Tuple[User, Optional[str]]:
    """Get existing user or create new one with API key
    Returns (user, api_key) where api_key is None for existing users"""
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        return user, None
    
    # Create new user with API key
    return create_user_with_api_key(user_id, db)


def validate_api_key(api_key: str, db: Session) -> Optional[User]:
    """Validate an API key and return the associated user"""
    key_hash = hash_api_key(api_key)
    
    api_key_obj = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True
    ).first()
    
    if not api_key_obj:
        return None
    
    # Update last used
    api_key_obj.last_used = datetime.now(timezone.utc)
    api_key_obj.user.last_active = datetime.now(timezone.utc)
    db.commit()
    
    return api_key_obj.user