# api/app/mcp_server.py
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator, Dict, Any
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


def setup_mcp_server(app: FastAPI):
    """Setup MCP (Model Context Protocol) server endpoints with proper JSON-RPC"""
    
    @app.get("/mcp/{client}/sse")
    async def mcp_sse_endpoint(
        client: str,
        request: Request,
        api_key: Optional[str] = Query(None, alias="key")
    ):
        """SSE endpoint for MCP clients with proper JSON-RPC protocol"""
        
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
            app_id = DEFAULT_APP_ID
        finally:
            db.close()
        
        logger.info(f"MCP SSE connection established for user: {user_id}, client: {client}")
        
        async def json_rpc_generator() -> AsyncGenerator[str, None]:
            """Generate JSON-RPC responses over SSE"""
            
            # Send initial capabilities response
            init_response = {
                "jsonrpc": "2.0",
                "id": 1,
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
            yield f"data: {json.dumps(init_response)}\n\n"
            
            # Keep connection alive and handle incoming requests
            request_id = 2
            while True:
                try:
                    # Send heartbeat every 30 seconds
                    await asyncio.sleep(30)
                    heartbeat = {
                        "jsonrpc": "2.0",
                        "method": "heartbeat",
                        "params": {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "user_id": user_id
                        }
                    }
                    yield f"data: {json.dumps(heartbeat)}\n\n"
                    
                except asyncio.CancelledError:
                    logger.info(f"MCP SSE connection closed for user: {user_id}")
                    break
                except Exception as e:
                    logger.error(f"Error in MCP SSE generator: {e}")
                    error_response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32603,
                            "message": "Internal error",
                            "data": str(e)
                        }
                    }
                    yield f"data: {json.dumps(error_response)}\n\n"
                    request_id += 1
        
        return StreamingResponse(
            json_rpc_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
    
    @app.post("/mcp/{client}/rpc")
    async def mcp_rpc_endpoint(
        client: str,
        request: Request,
        api_key: Optional[str] = Query(None, alias="key")
    ):
        """Handle JSON-RPC requests for MCP protocol"""
        
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
        
        # Handle different MCP methods
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
                            "description": "Add a new memory",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "text": {
                                        "type": "string",
                                        "description": "The memory to store"
                                    }
                                },
                                "required": ["text"]
                            }
                        },
                        {
                            "name": "search_memories",
                            "description": "Search through stored memories",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "Search query"
                                    }
                                },
                                "required": ["query"]
                            }
                        },
                        {
                            "name": "list_memories",
                            "description": "List all stored memories",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        }
                    ]
                }
            }
        
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            
            db = SessionLocal()
            try:
                if tool_name == "add_memory":
                    # Add memory to database
                    memory_client = get_memory_client(user_id, db)
                    memory_text = tool_args.get("text", "")
                    
                    result = memory_client.add(
                        memory_text,
                        user_id=user_id,
                        metadata={"app_id": app_id}
                    )
                    
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [{
                                "type": "text",
                                "text": f"Memory stored successfully with ID: {result.get('id', 'unknown')}"
                            }]
                        }
                    }
                
                elif tool_name == "search_memories":
                    query = tool_args.get("query", "")
                    memory_client = get_memory_client(user_id, db)
                    
                    results = memory_client.search(query, limit=10)
                    
                    if results:
                        memories_text = "\n\n".join([
                            f"Memory {i+1}:\n{mem.get('memory', '')}"
                            for i, mem in enumerate(results)
                        ])
                        response_text = f"Found {len(results)} memories:\n\n{memories_text}"
                    else:
                        response_text = "No memories found matching your query."
                    
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [{
                                "type": "text",
                                "text": response_text
                            }]
                        }
                    }
                
                elif tool_name == "list_memories":
                    memory_client = get_memory_client(user_id, db)
                    memories = memory_client.get_all(user_id=user_id)
                    
                    if memories:
                        memories_text = "\n\n".join([
                            f"Memory {i+1} (created {mem.get('created_at', 'unknown')}):\n{mem.get('memory', '')}"
                            for i, mem in enumerate(memories[:20])  # Limit to 20 for response size
                        ])
                        response_text = f"You have {len(memories)} memories. Showing first 20:\n\n{memories_text}"
                    else:
                        response_text = "No memories stored yet."
                    
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [{
                                "type": "text",
                                "text": response_text
                            }]
                        }
                    }
                
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32601,
                            "message": f"Unknown tool: {tool_name}"
                        }
                    }
            
            except Exception as e:
                logger.error(f"Error executing tool {tool_name}: {e}")
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32603,
                        "message": "Internal error",
                        "data": str(e)
                    }
                }
            finally:
                db.close()
        
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }