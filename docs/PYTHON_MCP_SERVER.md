# Python MCP Server Documentation

## Overview

The Python MCP server (`openmemory-mcp.py`) is a custom implementation of the Model Context Protocol (MCP) that bridges Claude Desktop to the OpenMemory API server. It was created as a lightweight, reliable solution after encountering compatibility issues with existing MCP implementations.

## Why This Server Was Created

### The Problem
1. **Original MCP Implementation Removed**: The codebase had its original FastMCP implementation replaced with a custom SSE endpoint that didn't follow MCP protocol
2. **Node.js SDK Issues**: The official `@modelcontextprotocol/sdk` package had compatibility issues and unclear API documentation
3. **Protocol Mismatch**: The current API's SSE endpoint was sending custom JSON messages instead of proper JSON-RPC format required by MCP

### The Solution
I created a simple Python-based MCP server that:
- Implements the JSON-RPC protocol correctly
- Uses standard libraries (only requires `requests`)
- Acts as a bridge between Claude Desktop and the HTTP API
- Handles authentication via API keys
- Provides clear error messages

## How It Works

```
Claude Desktop <--stdio--> Python MCP Server <--HTTP--> OpenMemory API (port 8765)
     (MCP)                  (Translation)                 (REST API)
```

### Key Components

1. **Protocol Handler**: Reads JSON-RPC requests from stdin, writes responses to stdout
2. **API Client**: Uses `requests` library to communicate with OpenMemory API
3. **Tool Mapping**: Translates MCP tool calls to appropriate API endpoints
4. **Error Handling**: Gracefully handles API errors and connection issues

## Installation & Usage

### Prerequisites
- Python 3.x installed
- `requests` library: `pip install requests`
- Valid OpenMemory API key

### Configuration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "openmemory": {
      "command": "python",
      "args": ["C:/path/to/openmemory-mcp.py"],
      "env": {
        "OPENMEMORY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Available Tools
1. **add_memory** - Store a new memory
2. **search_memories** - Search through stored memories (currently limited)
3. **list_memories** - List all memories for the authenticated user

## Current Architecture Limitations

### Windows Client, Linux Server Split
Currently, the architecture requires:
- **Python MCP Server**: Running on Windows (where Claude Desktop is installed)
- **API Server**: Running on Ubuntu server
- **Network Communication**: Over HTTP between Windows and Linux

This split architecture has drawbacks:
- Requires open ports (security concern)
- Network latency
- Multiple points of failure
- Complex debugging

## Goals for Server-Hosted Solution

### 1. Restore Native MCP Implementation
**Goal**: Re-implement proper MCP server within the API using FastMCP or similar

**Benefits**:
- Single deployment
- Better performance
- Easier maintenance
- Direct database access

**Implementation**:
```python
# In api/app/mcp_server.py
from mcp.server.fastmcp import FastMCP
from mcp.server.sse import SseServerTransport

mcp = FastMCP("openmemory-mcp-server")

@mcp.tool(description="Add a new memory")
async def add_memory(text: str) -> str:
    # Direct database access
    # No HTTP overhead
    # Proper error handling
```

### 2. Single SSE Endpoint
**Goal**: Have Claude Desktop connect directly to the Ubuntu server

**Current blockers**:
- The `/mcp/{client}/sse` endpoint doesn't implement MCP protocol
- It sends custom messages instead of JSON-RPC
- Authentication is handled differently

**Solution**:
```python
@app.get("/mcp/{client}/sse")
async def mcp_sse_endpoint(client: str, api_key: str = Query(...)):
    # Implement proper MCP protocol
    # Handle JSON-RPC messages
    # Stream responses via SSE
```

### 3. Unified Deployment
**Goal**: Everything runs on the Ubuntu server

**Architecture**:
```
Claude Desktop --SSE--> Ubuntu Server (mem-lab.duckdns.org:8765/mcp/sse)
                              |
                              ├── MCP Protocol Handler
                              ├── API Logic
                              ├── PostgreSQL
                              └── Qdrant
```

**Benefits**:
- Single point of deployment
- No client-side installation
- Centralized logging
- Better security (no local API keys)

### 4. Implementation Steps

1. **Study Original Implementation**:
   ```bash
   git show fdbf437:api/app/mcp_server.py
   ```
   The original used FastMCP properly

2. **Restore MCP Dependencies**:
   ```bash
   pip install mcp
   ```

3. **Fix Protocol Implementation**:
   - Accept JSON-RPC over SSE
   - Return proper JSON-RPC responses
   - Handle MCP tool definitions

4. **Update Claude Desktop Config**:
   ```json
   {
     "mcpServers": {
       "openmemory": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-sse@latest",
           "http://mem-lab.duckdns.org:8765/mcp/claude/sse?key=API_KEY"
         ]
       }
     }
   }
   ```

## Migration Path

### Phase 1: Fix Current SSE Endpoint (Quick Win)
- Modify `/mcp/{client}/sse` to speak JSON-RPC
- Test with existing SSE client
- Minimal code changes

### Phase 2: Restore FastMCP (Proper Solution)
- Re-implement the original MCP server design
- Use the MCP SDK properly
- Add comprehensive tool support

### Phase 3: Enhanced Features
- Streaming responses for long operations
- Real-time memory updates
- Multi-user collaboration features
- WebSocket support for bidirectional communication

## Security Considerations

### Current Issues
- API key transmitted in URL (should be in headers)
- No rate limiting on MCP endpoints
- No audit logging for MCP operations

### Recommendations
1. Move API key to Authorization header
2. Implement rate limiting per user
3. Add comprehensive logging
4. Consider mTLS for client authentication

## Conclusion

The Python MCP server is a **temporary but functional solution** that proves the concept works. The ultimate goal is to have a proper MCP implementation running directly on the Ubuntu server, eliminating the need for any client-side components beyond Claude Desktop's built-in SSE client.

This would make the system:
- **Easier to deploy** (just point Claude at the server)
- **More secure** (no local API keys)
- **More maintainable** (single codebase)
- **More performant** (no HTTP bridge)

The next Claude instance should prioritize fixing the server-side MCP implementation to achieve these goals.

## Appendix: Python MCP Server Code

Since the Python MCP server exists on the Windows client machine and not in this repository, here's the complete code for reference:

```python
#!/usr/bin/env python3
"""
OpenMemory MCP Server - Python implementation
"""
import json
import sys
import os
import requests
from typing import Dict, Any, Optional

API_URL = "http://mem-lab.duckdns.org:8765"
API_KEY = os.environ.get("OPENMEMORY_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else None)

if not API_KEY:
    print("Error: API key required. Set OPENMEMORY_API_KEY or pass as argument.", file=sys.stderr)
    sys.exit(1)

# Create session with auth headers
session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
})

def send_response(request_id: Any, result: Optional[Dict] = None, error: Optional[Dict] = None):
    """Send JSON-RPC response"""
    response = {
        "jsonrpc": "2.0",
        "id": request_id
    }
    
    if error:
        response["error"] = error
    else:
        response["result"] = result
    
    print(json.dumps(response))
    sys.stdout.flush()

def handle_initialize(request_id: Any, params: Dict):
    """Handle initialize request"""
    send_response(request_id, {
        "protocolVersion": "2025-06-18",
        "serverInfo": {
            "name": "openmemory-mcp",
            "version": "1.0.0"
        },
        "capabilities": {
            "tools": {}
        }
    })

def handle_tools_list(request_id: Any):
    """Handle tools/list request"""
    send_response(request_id, {
        "tools": [
            {
                "name": "add_memory",
                "description": "Add a new memory. This method is called everytime the user informs anything about themselves, their preferences, or anything that has any relevant information which can be useful in the future conversation.",
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
    })

def handle_tools_call(request_id: Any, params: Dict):
    """Handle tools/call request"""
    tool_name = params.get("name")
    args = params.get("arguments", {})
    
    try:
        if tool_name == "add_memory":
            response = session.post(f"{API_URL}/api/v1/memories/", json={
                "text": args.get("text", "")
            })
            response.raise_for_status()
            data = response.json()
            
            result_text = f"Memory saved! ID: {data.get('id', 'unknown')}"
            
        elif tool_name == "search_memories":
            response = session.post(
                f"{API_URL}/api/v1/memories/search",
                params={"query": args.get("query", ""), "limit": 10}
            )
            response.raise_for_status()
            data = response.json()
            
            result_text = json.dumps(data, indent=2)
            
        elif tool_name == "list_memories":
            response = session.post(f"{API_URL}/api/v1/memories/filter", json={
                "page": 1,
                "size": 50
            })
            response.raise_for_status()
            data = response.json()
            
            result_text = json.dumps(data, indent=2)
            
        else:
            result_text = f"Error: Unknown tool: {tool_name}"
        
        send_response(request_id, {
            "content": [{
                "type": "text",
                "text": result_text
            }]
        })
        
    except requests.exceptions.RequestException as e:
        error_msg = f"API Error: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                error_msg = f"API Error ({e.response.status_code}): {error_data}"
            except:
                error_msg = f"API Error ({e.response.status_code}): {e.response.text}"
        
        send_response(request_id, {
            "content": [{
                "type": "text",
                "text": error_msg
            }]
        })
    except Exception as e:
        send_response(request_id, {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        })

def handle_request(request: Dict):
    """Handle incoming JSON-RPC request"""
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")
    
    print(f"Handling request: {method}", file=sys.stderr)
    
    if method == "initialize":
        handle_initialize(request_id, params)
    elif method == "tools/list":
        handle_tools_list(request_id)
    elif method == "tools/call":
        handle_tools_call(request_id, params)
    else:
        send_response(request_id, None, {
            "code": -32601,
            "message": f"Method not found: {method}"
        })

def main():
    """Main loop"""
    print(f"OpenMemory MCP server starting...", file=sys.stderr)
    print(f"API URL: {API_URL}", file=sys.stderr)
    print(f"API Key: {API_KEY[:10]}...", file=sys.stderr)
    
    # Read from stdin line by line
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            request = json.loads(line)
            handle_request(request)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
```

This code should be saved as `openmemory-mcp.py` on any Windows machine that needs to connect Claude Desktop to the OpenMemory server.
