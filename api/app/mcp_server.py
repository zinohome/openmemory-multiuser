# api/app/mcp_server.py
import json
import logging
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator, Dict, Any, List
from uuid import uuid4
import traceback
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_or_create_user_with_api_key, validate_api_key
from app.config import DEFAULT_APP_ID
from app.database import SessionLocal
from app.models import App, Memory, User
from app.utils.memory import get_memory_client

logger = logging.getLogger(__name__)

# Store active SSE sessions with their message queues
sse_sessions: Dict[str, Dict[str, Any]] = {}


def setup_mcp_server(app: FastAPI):
    """Setup MCP (Model Context Protocol) server endpoints with proper SSE transport"""
    
    @app.get("/mcp/{client}/sse")
    async def mcp_sse_endpoint(
        client: str,
        request: Request,
        background_tasks: BackgroundTasks,
        api_key: Optional[str] = Query(None, alias="key")
    ):
        """SSE endpoint for MCP clients - supergateway compatible"""
        
        # Get API key from query parameter or header
        if not api_key:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                api_key = auth_header[7:]
            else:
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
            app_id = DEFAULT_APP_ID
        finally:
            db.close()
        
        # Create session
        session_id = str(uuid4())
        message_queue = asyncio.Queue()
        
        sse_sessions[session_id] = {
            "user_id": user_id,
            "app_id": app_id,
            "client": client,
            "queue": message_queue
        }
        
        logger.info(f"SSE session created: {session_id} for user: {user_id}, client: {client}")
        
        async def cleanup():
            """Clean up session on disconnect"""
            await asyncio.sleep(1)  # Give time for final messages
            if session_id in sse_sessions:
                del sse_sessions[session_id]
                logger.info(f"SSE session cleaned up: {session_id}")
        
        background_tasks.add_task(cleanup)
        
        async def event_generator() -> AsyncGenerator[str, None]:
            """Generate SSE events for supergateway"""
            try:
                # CRITICAL: Send the endpoint event first
                # This tells supergateway where to POST messages
                endpoint_path = f"/mcp/{client}/messages/{session_id}"
                yield f"event: endpoint\ndata: {endpoint_path}\n\n"
                
                logger.info(f"Sent endpoint event: {endpoint_path}")
                
                # Now wait for messages from the queue
                while True:
                    try:
                        if await request.is_disconnected():
                            logger.info(f"Client disconnected: {session_id}")
                            break
                        
                        # Wait for messages with timeout for heartbeat
                        try:
                            message = await asyncio.wait_for(
                                message_queue.get(), 
                                timeout=30.0
                            )
                            # Send message as SSE data
                            yield f"data: {json.dumps(message)}\n\n"
                            logger.debug(f"Sent message via SSE: {message.get('method', message.get('id'))}")
                        except asyncio.TimeoutError:
                            # Send heartbeat comment
                            yield ": keepalive\n\n"
                            
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        logger.error(f"Error in event generator: {e}")
                        break
                        
            except Exception as e:
                logger.error(f"Critical error in SSE generator: {e}")
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    
    @app.post("/mcp/{client}/messages/{session_id}")
    async def mcp_messages_endpoint(
        client: str,
        session_id: str,
        request: Request
    ):
        """Handle messages posted by supergateway"""
        
        session = sse_sessions.get(session_id)
        if not session:
            logger.error(f"Invalid session: {session_id}")
            return {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32600,
                    "message": "Invalid session"
                }
            }
        
        user_id = session["user_id"]
        app_id = session["app_id"]
        
        try:
            # Get the JSON-RPC request
            rpc_request = await request.json()
            logger.info(f"Received message: {rpc_request.get('method')} (id: {rpc_request.get('id')})")
            
            # Process the request
            method = rpc_request.get("method")
            params = rpc_request.get("params", {})
            request_id = rpc_request.get("id")
            
            # Handle different methods
            response = await process_mcp_request(
                method, params, request_id, user_id, app_id
            )
            
            # Queue the response to be sent via SSE
            await session["queue"].put(response)
            
            # Return empty response (actual response goes via SSE)
            return {"ok": True}
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            logger.error(traceback.format_exc())
            error_response = {
                "jsonrpc": "2.0",
                "id": rpc_request.get("id") if 'rpc_request' in locals() else None,
                "error": {
                    "code": -32603,
                    "message": "Internal error",
                    "data": str(e)
                }
            }
            await session["queue"].put(error_response)
            return {"ok": True}
    
    # Keep the existing RPC endpoint for direct testing
    @app.post("/mcp/{client}/rpc")
    async def mcp_rpc_endpoint(
        client: str,
        request: Request,
        api_key: Optional[str] = Query(None, alias="key")
    ):
        """Handle JSON-RPC requests directly (for testing)"""
        
        # Validate API key
        if not api_key:
            api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            return {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": "API key required"
                }
            }
        
        db = SessionLocal()
        try:
            user = validate_api_key(api_key, db)
            if not user:
                return {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": "Invalid API key"
                    }
                }
            user_id = user.user_id
            app_id = DEFAULT_APP_ID
        finally:
            db.close()
        
        # Parse JSON-RPC request
        try:
            rpc_request = await request.json()
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": "Parse error",
                    "data": str(e)
                }
            }
        
        method = rpc_request.get("method")
        params = rpc_request.get("params", {})
        request_id = rpc_request.get("id")
        
        # Process and return directly
        return await process_mcp_request(method, params, request_id, user_id, app_id)


async def process_mcp_request(method: str, params: dict, request_id: Any, user_id: str, app_id: str) -> dict:
    """Process MCP request and return response"""
    
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2025-06-18",
                "serverInfo": {
                    "name": "openmemory-mcp-server",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {}
                }
            }
        }
    
    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": [
                    {
                        "name": "add_memory",
                        "description": "Add a new memory. This method is called everytime the user informs anything about themselves, their preferences, or anything that has any relevant information which can be useful in the future conversation.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "text": {
                                    "type": "string",
                                    "description": "The text to store as a memory"
                                }
                            },
                            "required": ["text"]
                        }
                    },
                    {
                        "name": "search_memories",
                        "description": "Search through stored memories using a query",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The search query"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of results to return",
                                    "default": 5
                                }
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "list_memories",
                        "description": "List all memories for the authenticated user",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of memories to return",
                                    "default": 10
                                }
                            }
                        }
                    }
                ]
            }
        }
    
    elif method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        
        try:
            if tool_name == "add_memory":
                result = await handle_add_memory(user_id, app_id, tool_args)
            elif tool_name == "search_memories":
                result = await handle_search_memories(user_id, app_id, tool_args)
            elif tool_name == "list_memories":
                result = await handle_list_memories(user_id, app_id, tool_args)
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32602,
                        "message": f"Unknown tool: {tool_name}"
                    }
                }
            
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [{
                        "type": "text",
                        "text": result
                    }]
                }
            }
            
        except Exception as e:
            logger.error(f"Error handling tool call {tool_name}: {e}")
            logger.error(traceback.format_exc())
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [{
                        "type": "text",
                        "text": f"Error: {str(e)}"
                    }]
                }
            }
    
    else:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }


async def handle_add_memory(user_id: str, app_id: str, args: Dict[str, Any]) -> str:
    """Handle add_memory tool call"""
    text = args.get("text")
    if not text:
        return "Error: 'text' parameter is required"
    
    db = SessionLocal()
    try:
        # Get or create user and app
        user = db.query(User).filter_by(user_id=user_id).first()
        if not user:
            user = User(user_id=user_id)
            db.add(user)
            db.commit()
        
        app = db.query(App).filter_by(id=app_id).first()
        
        # Create memory record
        memory = Memory(
            id=str(uuid4()),
            user_id=user_id,
            app_id=app_id,
            memory=text,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(memory)
        db.commit()
        
        # Try to add to vector store if available
        try:
            from app.utils.memory import get_memory_client
            memory_client = get_memory_client()
            if memory_client:
                # Add to vector store
                memory_client.add(
                    messages=[{"role": "user", "content": text}],
                    user_id=user_id,
                    metadata={"app_id": app_id},
                )
                logger.info(f"Added memory to vector store for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to add to vector store: {e}")
            # Continue anyway - database entry was successful
        
        # Check if this is the user's first memory and return API key if so
        memory_count = db.query(Memory).filter_by(user_id=user_id).count()
        
        if memory_count == 1:
            # Get the API key for this user
            from app.models import ApiKey
            api_key_record = db.query(ApiKey).filter_by(user_id=user.id).first()
            if api_key_record:
                return f"Memory stored successfully! This was your first memory. Your API key for future use is: {api_key_record.key}"
        
        return f"Memory stored successfully. ID: {memory.id}"
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding memory: {e}")
        raise
    finally:
        db.close()


async def handle_search_memories(user_id: str, app_id: str, args: Dict[str, Any]) -> str:
    """Handle search_memories tool call"""
    query = args.get("query")
    limit = args.get("limit", 5)
    
    if not query:
        return "Error: 'query' parameter is required"
    
    try:
        # Try vector search first
        from app.utils.memory import get_memory_client
        memory_client = get_memory_client()
        if memory_client:
            results = memory_client.search(
                query=query,
                user_id=user_id,
                limit=limit
            )
            
            if results:
                formatted_results = []
                for i, result in enumerate(results, 1):
                    memory_text = result.get("memory", "")
                    score = result.get("score", 0)
                    formatted_results.append(f"{i}. {memory_text} (relevance: {score:.2f})")
                
                return f"Found {len(results)} memories:\n" + "\n".join(formatted_results)
            else:
                return "No memories found matching your query."
    except Exception as e:
        logger.warning(f"Vector search failed: {e}")
    
    # Fallback to database search
    db = SessionLocal()
    try:
        memories = db.query(Memory).filter(
            Memory.user_id == user_id,
            Memory.memory.ilike(f"%{query}%")
        ).limit(limit).all()
        
        if memories:
            formatted_results = []
            for i, memory in enumerate(memories, 1):
                formatted_results.append(f"{i}. {memory.memory}")
            
            return f"Found {len(memories)} memories:\n" + "\n".join(formatted_results)
        else:
            return "No memories found matching your query."
            
    finally:
        db.close()


async def handle_list_memories(user_id: str, app_id: str, args: Dict[str, Any]) -> str:
    """Handle list_memories tool call"""
    limit = args.get("limit", 10)
    
    db = SessionLocal()
    try:
        memories = db.query(Memory).filter_by(
            user_id=user_id
        ).order_by(Memory.created_at.desc()).limit(limit).all()
        
        if not memories:
            return "You have no stored memories yet."
        
        formatted_results = []
        for i, memory in enumerate(memories, 1):
            created_at = memory.created_at.strftime("%Y-%m-%d %H:%M:%S")
            formatted_results.append(f"{i}. [{created_at}] {memory.memory}")
        
        return f"Your {len(memories)} most recent memories:\n" + "\n".join(formatted_results)
        
    finally:
        db.close()
