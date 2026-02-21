# Claude Desktop Configuration - Phase 1B

## Full Mock Services - All Three MCP Servers

This guide configures Claude Desktop to work with all three Crown Hold MCP servers: **Polygon**, **Kraken**, and **Wise**.

## Prerequisites

- ✅ All three MCP servers built:
  - `cd applications/mcp-polygon && npm install --cache /tmp/.npm-cache && npm run build`
  - `cd applications/mcp-kraken && npm install --cache /tmp/.npm-cache && npm run build`
  - `cd applications/mcp-wise && npm install --cache /tmp/.npm-cache && npm run build`
- ✅ Claude Desktop installed
- ✅ Phase 1A completed successfully

## Step 1: Configure All Three MCP Servers

Edit Claude Desktop configuration file:

```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Complete configuration:**

```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ]
    },
    "crown-kraken-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-kraken/dist/main.js"
      ]
    },
    "crown-wise-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-wise/dist/main.js"
      ]
    }
  }
}
```

**⚠️ Important:**
- Use absolute paths
- Adjust `/Users/pasynkov/...` to your actual project location
- Verify JSON syntax is valid

## Step 2: Complete Custom Instructions

In Claude Desktop → Settings → Custom Instructions, add:

```
You are Crown Hold Financial Assistant with access to three financial platforms via MCP:

# AVAILABLE PLATFORMS

## 1. POLYGON (Blockchain)
Tools:
- polygon_get_balance: Get USDC and MATIC balance
- polygon_get_token_price: Get USDC/EUR price
- polygon_transfer_usdc: Transfer USDC (takes ~24 seconds for 12 confirmations)
- polygon_get_transaction_status: Check transaction status and confirmations
- polygon_get_transactions: View recent transaction history
- polygon_estimate_gas: Estimate gas cost for transfer

## 2. KRAKEN (Exchange)
Tools:
- kraken_get_balances: Get all balances (EUR, USDC, BTC, etc.)
- kraken_get_ticker: Get current price for trading pair
- kraken_deposit_address: Get deposit address for USDC
- kraken_check_deposit: Check if deposit credited (~3 min after blockchain confirms)
- kraken_create_order: Buy/sell order (executes in ~8 seconds)
- kraken_get_order_status: Check order status
- kraken_withdraw_fiat: Withdraw EUR to bank/Wise (~2 min)
- kraken_get_withdrawal_status: Check withdrawal status

## 3. WISE (International Transfers)
Tools:
- wise_get_balances: Get multi-currency balances
- wise_get_rate: Get exchange rate
- wise_get_recipients: List saved recipients (Revolut, banks)
- wise_create_transfer: Create transfer (~2 min, status timeline)
- wise_get_transfer_status: Check transfer status and timeline

# OPERATION RULES

1. **Always Confirm**: Before executing transfers or trades, summarize the operation and ask for confirmation
2. **Wait for Completion**: All operations are async - poll status until complete
3. **Status Updates**: Keep user informed during waits ("Waiting for confirmations...")
4. **Check Balances First**: Always verify sufficient balance before operations
5. **Handle Errors**: If operation fails, explain clearly and suggest next steps
6. **Natural Language**: Understand recipient aliases like "Revolut", "жене", "wife"

# COMMON WORKFLOWS

## Simple Balance Check
"What's my USDC balance?"
→ Call polygon_get_balance

## Simple Transfer
"Transfer 100 USDC to Kraken"
→ 1. polygon_get_balance (check sufficient)
→ 2. kraken_deposit_address (get address)
→ 3. polygon_transfer_usdc
→ 4. Poll polygon_get_transaction_status until confirmed
→ 5. Poll kraken_check_deposit until credited

## Top Up Revolut (COMPLEX)
"Top up Revolut with 100 EUR"
→ 1. Check all balances
→ 2. Get USDC/EUR rate
→ 3. Transfer USDC Polygon → Kraken (wait ~24 sec)
→ 4. Check deposit credited (wait ~3 min)
→ 5. Sell USDC for EUR (wait ~8 sec)
→ 6. Withdraw EUR to Wise (wait ~2 min)
→ 7. Get Revolut recipient ID
→ 8. Transfer EUR to Revolut (wait ~2 min)
→ 9. Confirm completion

# TIMING EXPECTATIONS (Mock)
- Polygon confirmation: ~24 seconds
- Kraken deposit: ~3 minutes
- Kraken order: ~8 seconds
- Kraken withdrawal: ~2 minutes
- Wise transfer: ~2 minutes
- **Full workflow**: ~7-10 minutes

# CURRENT MODE
🧪 MOCK MODE (Phase 1B): All operations use mock data and are safe to test.
No real money is involved. All timing is accelerated for testing.

# COMMUNICATION STYLE
- Be concise but informative
- Use clear status indicators (✓, ⏳, ❌)
- Show amounts and currencies clearly
- Explain wait times
- Celebrate successes! 🎉
```

## Step 3: Restart Claude Desktop

**Complete restart:**

```bash
# Press CMD+Q to quit completely
# Then reopen Claude Desktop
```

Or force restart:

```bash
killall Claude
open -a Claude
```

## Step 4: Verify All Three Servers

### Test 1: Check Available Tools

In Claude Desktop:

```
What financial tools do you have access to?
```

**Expected:** Claude should list tools from all three platforms (Polygon, Kraken, Wise)

### Test 2: Check Balances

```
Show me all my balances across all platforms
```

**Expected response:**
```
Your balances:

Polygon:
• USDC: 5,234.50
• MATIC: 12.45

Kraken:
• EUR: 2,150.30
• USDC: 208.73
• BTC: 0.0023

Wise:
• EUR: 1,500.00
• GBP: 800.00
• USD: 250.00
```

### Test 3: Simple Transfer

```
Transfer 100 USDC from Polygon to Kraken
```

**Expected workflow:**
1. Check Polygon balance ✓
2. Get Kraken deposit address ✓
3. Transfer 100 USDC
4. Wait ~24 seconds for confirmations
5. Check Kraken deposit
6. Wait ~3 minutes until credited
7. Confirm new balances

**Total time:** ~3.5 minutes

### Test 4: Exchange Rate

```
What's the current USDC to EUR rate?
```

**Expected:** Price around 0.92 EUR

### Test 5: Wise Recipients

```
Show me my Wise recipients
```

**Expected:** List of 3 recipients (Revolut EUR, Revolut GBP, Bank EUR)

## Troubleshooting

### One or More Servers Not Visible

Check each server individually:

```bash
# Test Polygon
node /Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js

# Test Kraken
node /Users/pasynkov/dev/crownhold/applications/mcp-kraken/dist/main.js

# Test Wise
node /Users/pasynkov/dev/crownhold/applications/mcp-wise/dist/main.js
```

Each should output startup message. Press Ctrl+C to stop.

### Claude Doesn't See All Tools

1. Verify config file syntax (no trailing commas!)
2. Check all paths are absolute
3. Restart Claude Desktop completely (CMD+Q)
4. Check Claude Desktop logs:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### Tools Not Being Called

- Custom Instructions not added → Add them
- Instructions not clear → Try explicit: "Use polygon_get_balance tool"
- Create new conversation to refresh context

## Phase 1B Test Scenarios

### Scenario 1: Balance Aggregation ✅

```
User: Show all my balances

Expected: Claude calls all three balance tools and displays aggregated view
Time: ~3 seconds
```

### Scenario 2: Simple Polygon Transfer ✅

```
User: Transfer 50 USDC to Kraken

Expected: Full workflow with status updates
Time: ~3.5 minutes
```

### Scenario 3: Trade on Kraken ✅

```
User: Sell 100 USDC for EUR on Kraken

Expected: Order created → Wait 8 sec → Order filled → Balances updated
Time: ~15 seconds
```

### Scenario 4: Wise Transfer ✅

```
User: Send 100 EUR to Revolut via Wise

Expected: Transfer created → Status timeline → Completed
Time: ~2 minutes
```

### Scenario 5: FULL WORKFLOW - Top Up Revolut 🎯

```
User: Top up my Revolut with 100 EUR using my Polygon USDC

Expected: Complete chain (7-10 steps) with all status checks
Time: ~7-10 minutes
Success Criteria: All steps complete, Revolut receives EUR
```

## Success Criteria for Phase 1B

- ✅ All three MCP servers running
- ✅ Claude sees all tools from all three platforms
- ✅ Can check balances on all platforms
- ✅ Can execute simple operations (transfer, trade, wise transfer)
- ✅ Can execute complex workflow end-to-end
- ✅ All async operations handle status correctly
- ✅ Balances update appropriately
- ✅ Error handling works (insufficient balance, etc.)

## What's Next?

After Phase 1B succeeds, you have:

1. ✅ Proven MCP integration with multiple servers
2. ✅ Validated complex async workflows
3. ✅ Tested error handling
4. ✅ Confirmed user experience

**Ready for Phase 2:** Research & API Analysis, then real integrations!

## Configuration Files Summary

### claude_desktop_config.json
```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"]
    },
    "crown-kraken-mock": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-kraken/dist/main.js"]
    },
    "crown-wise-mock": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-wise/dist/main.js"]
    }
  }
}
```

### Custom Instructions Location
Claude Desktop → Settings → Custom Instructions (paste the complete instructions above)

---

**Phase 1B Complete!** 🎉

You now have a fully functional mock financial orchestration system working through Claude!
