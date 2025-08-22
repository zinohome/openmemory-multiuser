# api/app/models.py
import hashlib
import secrets
import string
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def get_current_utc_time():
    return datetime.now(datetime.UTC)


def generate_api_key() -> str:
    """Generate a secure API key in format: mem_lab_xxxxxxxxxxxx"""
    chars = string.ascii_lowercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(12))
    return f"mem_lab_{random_part}"


def hash_api_key(api_key: str) -> str:
    """Hash an API key for secure storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()


class MemoryState(PyEnum):
    active = "active"
    archived = "archived"
    deleted = "deleted"


class User(Base):
    __tablename__ = "users"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    user_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True, index=True)
    email = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=get_current_utc_time, index=True)
    updated_at = Column(DateTime, 
                        default=get_current_utc_time,
                        onupdate=get_current_utc_time)
    last_active = Column(DateTime, default=get_current_utc_time)
    
    # API Key relationship
    api_key = relationship("ApiKey", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Other relationships
    apps = relationship("App", back_populates="owner")
    memories = relationship("Memory", back_populates="user")


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    user_id = Column(UUID, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    key_hash = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=get_current_utc_time)
    last_used = Column(DateTime, default=get_current_utc_time)
    is_active = Column(Boolean, default=True, nullable=False)
    
    user = relationship("User", back_populates="api_key")


class App(Base):
    __tablename__ = "apps"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    name = Column(String, nullable=False, index=True)
    owner_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=get_current_utc_time, index=True)
    updated_at = Column(DateTime,
                        default=get_current_utc_time,
                        onupdate=get_current_utc_time)

    owner = relationship("User", back_populates="apps")
    memories = relationship("Memory", back_populates="app")

    __table_args__ = (
        sa.UniqueConstraint('owner_id', 'name', name='idx_app_owner_name'),
    )


class Memory(Base):
    __tablename__ = "memories"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    app_id = Column(UUID, ForeignKey("apps.id"), nullable=False, index=True)
    content = Column(String, nullable=False)
    vector = Column(String)
    metadata_ = Column('metadata', JSON, default=dict)
    state = Column(Enum(MemoryState), default=MemoryState.active, index=True)
    created_at = Column(DateTime, default=get_current_utc_time, index=True)
    updated_at = Column(DateTime,
                        default=get_current_utc_time,
                        onupdate=get_current_utc_time)
    archived_at = Column(DateTime, nullable=True, index=True)
    deleted_at = Column(DateTime, nullable=True, index=True)

    user = relationship("User", back_populates="memories")
    app = relationship("App", back_populates="memories")
    categories = relationship("Category", secondary="memory_categories", back_populates="memories")

    __table_args__ = (
        Index('idx_memory_user_state', 'user_id', 'state'),
        Index('idx_memory_app_state', 'app_id', 'state'),
        Index('idx_memory_user_app', 'user_id', 'app_id'),
    )


class Category(Base):
    __tablename__ = "categories"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)
    created_at = Column(DateTime, default=get_current_utc_time, index=True)

    memories = relationship("Memory", secondary="memory_categories", back_populates="categories")


class MemoryCategory(Base):
    __tablename__ = "memory_categories"
    memory_id = Column(UUID, ForeignKey("memories.id"), primary_key=True, index=True)
    category_id = Column(UUID, ForeignKey("categories.id"), primary_key=True, index=True)
    assigned_at = Column(DateTime, default=get_current_utc_time)

    __table_args__ = (
        Index('idx_memory_category', 'memory_id', 'category_id'),
    )


class Config(Base):
    __tablename__ = "configs"
    id = Column(UUID, primary_key=True, default=lambda: uuid4())
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=get_current_utc_time)
    updated_at = Column(DateTime,
                        default=get_current_utc_time,
                        onupdate=get_current_utc_time)