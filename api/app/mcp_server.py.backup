# api/app/mcp_server.py
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_or_create_user_with_api_key, validate_api_key
from app.config import DEFAULT_APP_ID
from app.database import SessionLocal
from app.models import App, Memory, User
from app.utils.memory import get_memory_client

logger = logging.getLogger(__name__)


class MCPMessage(BaseModel):
    message: dict


def setup_mcp_server(app: FastAPI):
    """Setup MCP (Model Context Protocol) server endpoints"""
    
    @app.get("/mcp/{client}/sse")
    async def mcp_sse_endpoint(
        client: str,
        request: Request,
        api_key: Optional[str] = Query(None, alias="key")
    ):
        """SSE endpoint for MCP clients with API key authentication"""
        
        # Get API key from query parameter or header
        if not api_key:
            api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
        
        # Validate API key
        db = SessionLocal()
        try:
            user = validate_api_key(api_key, db)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid API key")
            user_id = user.user_id
        finally:
            db.close()
        
        logger.info(f"MCP SSE connection established for user: {user_id}, client: {client}")
        
        async def event_generator():
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connection', 'status': 'connected', 'user_id': user_id})}\n\n"
            
            # Keep connection alive
            while True:
                import asyncio
                await asyncio.sleep(30)
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
    
    @app.post("/mcp/messages/")
    async def handle_mcp_message(message: MCPMessage):
        """Handle incoming MCP messages"""
        msg = message.message
        
        if msg.get("method") == "add_memories":
            return await handle_add_memories(msg.get("params", {}))
        elif msg.get("method") == "search_memory":
            return await handle_search_memory(msg.get("params", {}))
        elif msg.get("method") == "list_memories":
            return await handle_list_memories(msg.get("params", {}))
        elif msg.get("method") == "delete_all_memories":
            return await handle_delete_all_memories(msg.get("params", {}))
        else:
            raise HTTPException(status_code=400, detail=f"Unknown method: {msg.get('method')}")
    
    async def handle_add_memories(params: dict):
        """Handle add_memories request from MCP client"""
        text = params.get("text", "")
        user_id = params.get("user_id", "default_user")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        db = SessionLocal()
        api_key_returned = None
        
        try:
            # Get or create user with API key
            user, new_api_key = get_or_create_user_with_api_key(user_id, db)
            
            # If new user, store the API key to return
            if new_api_key:
                api_key_returned = new_api_key
                logger.info(f"Created new user {user_id} with API key")
            
            # Get or create default app
            app = db.query(App).filter(
                App.name == DEFAULT_APP_ID,
                App.owner_id == user.id
            ).first()
            
            if not app:
                app = App(
                    id=uuid4(),
                    name=DEFAULT_APP_ID,
                    owner_id=user.id
                )
                db.add(app)
                db.flush()
            
            # Create memory in SQL database
            memory = Memory(
                id=uuid4(),
                user_id=user.id,
                app_id=app.id,
                content=text,
                created_at=datetime.now(timezone.utc)
            )
            db.add(memory)
            db.commit()
            
            # Also add to vector store (Qdrant) with proper metadata
            try:
                memory_client = get_memory_client()
                if memory_client:
                    # Add memory with infer=False to prevent categorization
                    memory_client.add(
                        messages=text,
                        user_id=user_id,
                        metadata={
                            "app_id": str(app.id),
                            "memory_id": str(memory.id),
                            "created_at": memory.created_at.isoformat()
                        },
                        infer=False
                    )
                    logger.info(f"Added memory to Qdrant for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to add memory to Qdrant: {e}")
            
            response = {
                "success": True,
                "memory_id": str(memory.id),
                "message": "Memory added successfully"
            }
            
            # Include API key if this was a new user
            if api_key_returned:
                response["api_key"] = api_key_returned
                response["message"] = f"New user created! Your API key is: {api_key_returned}\nPlease save this key - it will not be shown again."
            
            return response
            
        except Exception as e:
            logger.error(f"Error adding memory: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()
    
    async def handle_search_memory(params: dict):
        """Handle search_memory request from MCP client"""
        query = params.get("query", "")
        user_id = params.get("user_id", "default_user")
        limit = params.get("limit", 10)
        
        try:
            memory_client = get_memory_client()
            if not memory_client:
                return {"results": [], "message": "Memory client not initialized"}
            
            # Search memories with user filtering
            results = memory_client.search(
                query=query,
                user_id=user_id,
                limit=limit
            )
            
            return {
                "results": results.get("results", []),
                "total": len(results.get("results", []))
            }
            
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def handle_list_memories(params: dict):
        """Handle list_memories request from MCP client"""
        user_id = params.get("user_id", "default_user")
        
        db = SessionLocal()
        try:
            # Get user
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user:
                return {"memories": [], "total": 0}
            
            # Get all memories for user
            memories = db.query(Memory).filter(
                Memory.user_id == user.id,
                Memory.state == "active"
            ).order_by(Memory.created_at.desc()).all()
            
            memory_list = [
                {
                    "id": str(memory.id),
                    "content": memory.content,
                    "created_at": memory.created_at.isoformat()
                }
                for memory in memories
            ]
            
            return {
                "memories": memory_list,
                "total": len(memory_list)
            }
            
        except Exception as e:
            logger.error(f"Error listing memories: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()
    
    async def handle_delete_all_memories(params: dict):
        """Handle delete_all_memories request from MCP client"""
        user_id = params.get("user_id", "default_user")
        
        db = SessionLocal()
        try:
            # Get user
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user:
                return {"success": False, "message": "User not found"}
            
            # Soft delete all memories
            memories = db.query(Memory).filter(
                Memory.user_id == user.id,
                Memory.state == "active"
            ).all()
            
            for memory in memories:
                memory.state = "deleted"
                memory.deleted_at = datetime.now(timezone.utc)
            
            db.commit()
            
            # Also delete from vector store
            try:
                memory_client = get_memory_client()
                if memory_client:
                    memory_client.delete_all(user_id=user_id)
            except Exception as e:
                logger.error(f"Failed to delete from Qdrant: {e}")
            
            return {
                "success": True,
                "deleted_count": len(memories),
                "message": f"Deleted {len(memories)} memories"
            }
            
        except Exception as e:
            logger.error(f"Error deleting memories: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()