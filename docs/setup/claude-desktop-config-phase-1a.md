# Claude Desktop Configuration - Phase 1A

## Minimal Mock MCP Server Setup

This guide will help you configure Claude Desktop to work with the minimal Polygon MCP server for testing integration.

## Prerequisites

- ✅ Crown Hold Polygon MCP server built (`npm run build` completed)
- ✅ Claude Desktop installed
- ✅ Server starts successfully: `node /Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js`

## Step 1: Configure MCP Server

Edit Claude Desktop configuration file:

```bash
# Open configuration file
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the following configuration:

```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ]
    }
  }
}
```

**⚠️ Important:**
- Use **absolute path** to main.js
- Adjust path if your project is in different location
- Ensure JSON syntax is valid (no trailing commas)

## Step 2: Add Custom Instructions

In Claude Desktop, add custom instructions to help Claude understand when to use the tools:

### Option A: Custom Instructions (Recommended)

1. Open Claude Desktop
2. Go to Settings → Custom Instructions
3. Add the following:

```
You have access to Crown Hold financial tools via MCP.

Available tools:
- polygon_get_balance: Get Polygon USDC and MATIC balance
- polygon_get_token_price: Get current USDC price in EUR

When user asks about balance or funds, call polygon_get_balance.
When user asks about price or exchange rate, call polygon_get_token_price.

Display results in friendly, formatted output.

Currently in TESTING mode with MOCK data (Phase 1A).
```

### Option B: Project Instructions

1. Create a new Project in Claude Desktop named "Crown Hold"
2. Add the same instructions above to the project
3. Always use this project when testing

### Option C: In-Chat Instructions

Simply paste the instructions at the start of each conversation:

```
I'm testing Crown Hold MCP integration. You have polygon_get_balance
and polygon_get_token_price tools. Use them when I ask about balance or price.
This is mock data for testing.
```

## Step 3: Restart Claude Desktop

**Complete restart required:**

```bash
# On macOS
# Press CMD+Q to quit Claude Desktop completely
# Then reopen Claude Desktop
```

Or force quit:

```bash
killall Claude
open -a Claude
```

## Step 4: Verify Integration

### Test 1: Check if Claude sees the tools

In Claude Desktop, ask:

```
What tools do you have access to?
```

**Expected response:**
```
I have access to the following Crown Hold financial tools:
1. polygon_get_balance - Get USDC and MATIC balance from Polygon wallet
2. polygon_get_token_price - Get current USDC price in EUR

These are currently running in mock mode for testing.
```

**If Claude doesn't see the tools:**
- ❌ MCP server configuration incorrect
- Check config file path is absolute
- Check JSON syntax is valid
- Check server builds and runs: `npm run build`
- Check Claude Desktop logs (see Troubleshooting)

### Test 2: Check if Claude calls the tools

Ask:

```
What's my balance?
```

**Expected response:**
```
[Claude calls polygon_get_balance tool]

Your Polygon wallet balance:
• USDC: 5,234.50
• MATIC: 12.45
• Wallet: 0xMOCK1234567890abcdef

(This is mock data for testing)
```

**If Claude doesn't call the tool:**
- ❌ Custom Instructions not added
- Add instructions per Step 2
- Or explicitly ask: "Use polygon_get_balance tool"

### Test 3: Second tool

Ask:

```
What's the USDC price?
```

**Expected response:**
```
[Claude calls polygon_get_token_price tool]

Current USDC price: €0.92

(This is mock data for testing)
```

## Troubleshooting

### MCP Server Not Starting

**Check manually:**
```bash
node /Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js
```

Should output:
```
Crown Hold Polygon Mock MCP server running on stdio
Version: 0.1.0
Phase: 1A - Minimal Mock for Testing
```

Press Ctrl+C to stop.

**If it doesn't start:**
- Check `npm run build` completed successfully
- Check no TypeScript errors
- Check all dependencies installed: `npm install`

### Claude Desktop Logs

View logs to debug MCP issues:

```bash
# Recent logs
tail -f ~/Library/Logs/Claude/mcp*.log

# Or open logs folder
open ~/Library/Logs/Claude/
```

Look for errors related to:
- `crown-polygon-mock`
- Failed to spawn process
- Connection errors

### Common Issues

**1. "Command not found: node"**
- Claude Desktop can't find node
- Add full path to node in config:
```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"]
    }
  }
}
```

Find node path: `which node`

**2. "Cannot find module @modelcontextprotocol/sdk"**
- Dependencies not installed
- Run: `npm install --cache /tmp/.npm-cache` in applications/mcp-polygon/

**3. "ENOENT: no such file or directory"**
- Path to main.js is wrong
- Use absolute path
- Check file exists: `ls /Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js`

**4. Claude doesn't see tools**
- Config file not saved
- Claude Desktop not restarted properly (use CMD+Q)
- JSON syntax error in config

**5. Claude doesn't call tools**
- Custom Instructions not added
- Ask explicitly to use the tool
- Try different phrasing: "Use the balance tool"

## Success Criteria

Phase 1A is successful when:

- ✅ MCP server starts without errors
- ✅ Claude Desktop sees both tools (polygon_get_balance, polygon_get_token_price)
- ✅ Claude calls polygon_get_balance when asked about balance
- ✅ Claude calls polygon_get_token_price when asked about price
- ✅ Results are formatted and displayed correctly
- ✅ Custom Instructions work as expected

## Next Steps

Once Phase 1A is working:

1. **Document your experience**
   - What worked immediately?
   - What required troubleshooting?
   - How long did it take?

2. **Experiment with variations**
   - Different ways to ask for balance
   - Does Claude understand Russian? Try: "Какой у меня баланс?"
   - What if you ask indirectly: "Do I have enough money?"

3. **Ready for Phase 1B**
   - You've proven MCP integration works!
   - Now you can confidently build full mock services
   - Move to: [Phase 1B: Full Mock Services](../plan/phase-1b-full-mocks.md)

## Configuration Files Reference

### claude_desktop_config.json
```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ]
    }
  }
}
```

### Custom Instructions
```
You have access to Crown Hold financial tools via MCP.

Available tools:
- polygon_get_balance: Get Polygon USDC and MATIC balance
- polygon_get_token_price: Get current USDC price in EUR

When user asks about balance or funds, call polygon_get_balance.
When user asks about price or exchange rate, call polygon_get_token_price.

Display results in friendly, formatted output.

Currently in TESTING mode with MOCK data (Phase 1A).
```

---

**Phase 1A Complete!** 🎉

You've successfully integrated Crown Hold with Claude Desktop using the Model Context Protocol!
