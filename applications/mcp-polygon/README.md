# Crown Hold - Polygon MCP Server

Model Context Protocol server for Polygon blockchain interactions.

## Current Status: Phase 1A - Minimal Mock

This is a **minimal mock implementation** for testing Claude Desktop integration.

**Features:**
- ✅ Two mock tools for testing
- ✅ stdio-based MCP server
- ✅ Validates Claude Desktop integration

## Tools

### polygon_get_balance

Get USDC and MATIC balance from Polygon wallet.

**Returns (mock data):**
```json
{
  "success": true,
  "data": {
    "address": "0xMOCK1234567890abcdef",
    "usdc": "5234.50",
    "matic": "12.45"
  }
}
```

### polygon_get_token_price

Get current USDC price in EUR.

**Returns (mock data):**
```json
{
  "success": true,
  "data": {
    "token": "USDC",
    "currency": "EUR",
    "price": "0.9200"
  }
}
```

## Installation

```bash
# From project root
cd applications/mcp-polygon

# Install dependencies
npm install --cache /tmp/.npm-cache

# Build
npm run build

# Test run (press Ctrl+C to exit)
npm start
```

## Claude Desktop Configuration

See: [Claude Desktop Configuration - Phase 1A](../../docs/setup/claude-desktop-config-phase-1a.md)

Quick setup:

1. Build the server: `npm run build`
2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "crown-polygon-mock": {
         "command": "node",
         "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"]
       }
     }
   }
   ```
3. Restart Claude Desktop (CMD+Q)
4. Add Custom Instructions (see full guide)
5. Test: "What's my balance?"

## Development

```bash
# Build
npm run build

# Build and run
npm run dev
```

## Next Steps

After Phase 1A succeeds:
- Phase 1B: Full mock services with all tools
- Phase 2: Real Polygon integration with ethers.js

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
└────────┬────────┘
         │ stdio
    ┌────┴────┐
    │   MCP   │
    │ Server  │
    └────┬────┘
         │
    ┌────┴────┐
    │  Mock   │
    │  Data   │
    └─────────┘
```

Phase 1A: Validates this entire stack works correctly.
