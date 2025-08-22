#!/bin/bash
# Test script for OpenMemory fixes

echo "🧪 OpenMemory Fix Testing Script"
echo "================================="
echo ""

# Configuration
API_URL="http://mem-lab.duckdns.org:8765"
UI_URL="http://mem-lab.duckdns.org:3000"
API_KEY="mem_lab_v26fp933sg61"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if API is running
echo "1️⃣ Testing API Server..."
if curl -s http://localhost:8765/health > /dev/null; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not responding${NC}"
    exit 1
fi

# Test 2: Test API authentication
echo ""
echo "2️⃣ Testing API Authentication..."
RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/validate \
    -H "Content-Type: application/json" \
    -d "{\"api_key\": \"$API_KEY\"}")

if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ API authentication working${NC}"
else
    echo -e "${RED}❌ API authentication failed${NC}"
    echo "Response: $RESPONSE"
fi

# Test 3: Check UI environment variables
echo ""
echo "3️⃣ Checking UI Environment Variables..."
echo "Inspecting UI container build..."

# Check if the UI is using the correct API URL
UI_LOGS=$(docker logs openmemory-ui 2>&1 | head -50)
if echo "$UI_LOGS" | grep -q "NEXT_PUBLIC_API_URL"; then
    echo -e "${YELLOW}⚠️  Found NEXT_PUBLIC_API_URL in logs${NC}"
fi

# Test the actual UI endpoint
echo "Testing UI login page..."
UI_RESPONSE=$(curl -s $UI_URL | head -200)

if echo "$UI_RESPONSE" | grep -q "NEXT_PUBLIC_API_URL"; then
    echo -e "${RED}❌ UI still has placeholder environment variable${NC}"
    echo "The UI needs to be rebuilt with proper environment variables"
else
    echo -e "${GREEN}✅ UI environment variables appear to be injected${NC}"
fi

# Test 4: Test MCP JSON-RPC endpoint
echo ""
echo "4️⃣ Testing MCP JSON-RPC Endpoint..."

# Test initialize method
INIT_RESPONSE=$(curl -s -X POST "$API_URL/mcp/test/rpc?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {}
    }')

if echo "$INIT_RESPONSE" | grep -q "protocolVersion"; then
    echo -e "${GREEN}✅ MCP JSON-RPC initialize method working${NC}"
else
    echo -e "${RED}❌ MCP JSON-RPC not responding correctly${NC}"
    echo "Response: $INIT_RESPONSE"
fi

# Test tools/list method
TOOLS_RESPONSE=$(curl -s -X POST "$API_URL/mcp/test/rpc?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }')

if echo "$TOOLS_RESPONSE" | grep -q "add_memory"; then
    echo -e "${GREEN}✅ MCP tools/list method working${NC}"
else
    echo -e "${RED}❌ MCP tools/list not working${NC}"
    echo "Response: $TOOLS_RESPONSE"
fi

# Test 5: Test SSE endpoint
echo ""
echo "5️⃣ Testing MCP SSE Endpoint..."
echo "Connecting to SSE stream (5 second test)..."

timeout 5 curl -s -N "$API_URL/mcp/test/sse?key=$API_KEY" > /tmp/sse_test.txt 2>&1 &
SSE_PID=$!
sleep 5
kill $SSE_PID 2>/dev/null

if grep -q "jsonrpc" /tmp/sse_test.txt; then
    echo -e "${GREEN}✅ MCP SSE endpoint sending JSON-RPC${NC}"
else
    echo -e "${RED}❌ MCP SSE endpoint not sending proper JSON-RPC${NC}"
    echo "SSE output:"
    cat /tmp/sse_test.txt
fi

# Test 6: Full integration test - Add a memory via MCP
echo ""
echo "6️⃣ Testing Full MCP Memory Storage..."

MEMORY_RESPONSE=$(curl -s -X POST "$API_URL/mcp/test/rpc?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "add_memory",
            "arguments": {
                "text": "Test memory from fix verification script"
            }
        }
    }')

if echo "$MEMORY_RESPONSE" | grep -q "Memory stored successfully"; then
    echo -e "${GREEN}✅ MCP memory storage working${NC}"
else
    echo -e "${RED}❌ MCP memory storage failed${NC}"
    echo "Response: $MEMORY_RESPONSE"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo ""
echo "If all tests passed:"
echo "  1. Rebuild UI: docker compose up -d --build openmemory-ui"
echo "  2. Clear browser cache and try logging in"
echo "  3. Update Claude Desktop config to use the new SSE endpoint"
echo ""
echo "Claude Desktop config should be:"
echo '```json'
echo '{'
echo '  "mcpServers": {'
echo '    "openmemory": {'
echo '      "command": "npx",'
echo '      "args": ['
echo '        "-y",'
echo '        "@modelcontextprotocol/server-sse@latest",'
echo "        \"$API_URL/mcp/claude/sse?key=$API_KEY\""
echo '      ]'
echo '    }'
echo '  }'
echo '}'
echo '```'