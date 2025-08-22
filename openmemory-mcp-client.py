#!/usr/bin/env python3
"""
Simple MCP client for OpenMemory that uses the HTTP API
"""
import json
import sys
import asyncio
import aiohttp
from typing import Dict, Any, Optional

API_URL = "http://mem-lab.duckdns.org:8765"
API_KEY = sys.argv[1] if len(sys.argv) > 1 else None

async def send_response(response: Dict[str, Any]):
    """Send a JSON-RPC response to stdout"""
    print(json.dumps(response))
    sys.stdout.flush()

async def handle_request(request: Dict[str, Any]):
    """Handle incoming JSON-RPC requests"""
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")
    
    if method == "initialize":
        # Respond to initialization
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2025-06-18",
                "serverInfo": {
                    "name": "openmemory-mcp",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {
                        "add_memories": {},
                        "search_memory": {},
                        "list_memories": {},
                        "delete_all_memories": {}
                    }
                }
            }
        }
        await send_response(response)
    
    elif method == "tools/call":
        tool_name = params.get("name")
        tool_params = params.get("arguments", {})
        
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {API_KEY}"}
            
            try:
                if tool_name == "add_memories":
                    # Create memory via API
                    async with session.post(
                        f"{API_URL}/api/v1/memories/",
                        json={"text": tool_params.get("text", "")},
                        headers=headers
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            # Check if this is a new user with API key
                            if "api_key" in data:
                                result = f"Memory saved! New API key generated: {data['api_key']}\nPlease save this key!"
                            else:
                                result = f"Memory saved with ID: {data.get('id', 'unknown')}"
                        else:
                            result = f"Error: {resp.status} - {await resp.text()}"
                
                elif tool_name == "search_memory":
                    # Search memories
                    query = tool_params.get("query", "")
                    async with session.post(
                        f"{API_URL}/api/v1/memories/search",
                        params={"query": query, "limit": 10},
                        headers=headers
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            result = json.dumps(data, indent=2)
                        else:
                            result = f"Error: {resp.status} - {await resp.text()}"
                
                elif tool_name == "list_memories":
                    # List memories
                    async with session.post(
                        f"{API_URL}/api/v1/memories/filter",
                        json={"page": 1, "size": 50},
                        headers=headers
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            result = json.dumps(data, indent=2)
                        else:
                            result = f"Error: {resp.status} - {await resp.text()}"
                
                else:
                    result = f"Unknown tool: {tool_name}"
                
            except Exception as e:
                result = f"Error calling API: {str(e)}"
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": result
                    }
                ]
            }
        }
        await send_response(response)
    
    else:
        # Unknown method
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }
        await send_response(response)

async def main():
    """Main event loop"""
    if not API_KEY:
        print("Usage: python openmemory-mcp-client.py <API_KEY>", file=sys.stderr)
        sys.exit(1)
    
    # Read from stdin
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            request = json.loads(line.strip())
            await handle_request(request)
            
        except json.JSONDecodeError as e:
            print(f"Invalid JSON: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())
