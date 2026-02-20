# Claude Desktop Setup Guide

This guide explains how to configure Claude Desktop to work with Crown Hold MCP servers.

## Prerequisites

- Claude Desktop installed
- Crown Hold MCP servers built
- Environment variables configured (see [Environment Setup](environment-setup.md))

## Understanding MCP Configuration

### Local-Only Execution Model

**Crown Hold MCP servers run as local processes, not network services:**

- ✅ Launched by Claude Desktop on your machine
- ✅ Communication via stdio (stdin/stdout)
- ✅ No network ports opened
- ✅ No HTTP endpoints exposed
- ✅ Cannot be accessed remotely
- ✅ Terminates when Claude Desktop closes

**This means:**
- Enhanced security (no network attacks possible)
- Simple setup (no firewall, SSL, or authentication)
- Fast performance (no network overhead)
- Privacy (all data stays on your machine)

### Configuration File Location

Claude Desktop reads MCP server configuration from:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

This configuration tells Claude Desktop which local processes to spawn and how to communicate with them via stdio.

## Configuration Steps

### 1. Build MCP Servers

```bash
cd /Users/pasynkov/dev/crownhold
npm install
npm run build
```

### 2. Locate MCP Server Executables

After building, MCP servers will be at:
```
applications/mcp-polygon/dist/main.js
applications/mcp-kraken/dist/main.js
applications/mcp-wise/dist/main.js
```

### 3. Configure Claude Desktop

Edit the Claude Desktop configuration file:

```bash
# macOS
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# or use any text editor
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the following configuration:

```json
{
  "mcpServers": {
    "crown-polygon": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "crown-kraken": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-kraken/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "crown-wise": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-wise/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/Users/pasynkov/dev/crownhold` with your actual project path.

### 4. Restart Claude Desktop

Completely quit and restart Claude Desktop for changes to take effect.

### 5. Verify Installation

Open a new conversation in Claude Desktop and ask:

```
"What MCP tools do you have available?"
```

Claude should list tools from all three Crown Hold MCP servers.

## MCP Server Tools Reference

Once configured, Claude will have access to these tools:

### Polygon Tools (crown-polygon)

| Tool | Description |
|------|-------------|
| `polygon_get_balance` | Get USDC and token balances |
| `polygon_get_token_price` | Get current token price |
| `polygon_transfer_usdc` | Transfer USDC to predefined address |
| `polygon_get_transaction_status` | ⚠️ Check transaction confirmation status |
| `polygon_get_transactions` | View transaction history |
| `polygon_estimate_gas` | Estimate gas for transaction |

### Kraken Tools (crown-kraken)

| Tool | Description |
|------|-------------|
| `kraken_get_balances` | Get account balances |
| `kraken_get_ticker` | Get ticker for trading pair |
| `kraken_deposit_address` | Get crypto deposit address |
| `kraken_check_deposit` | ⚠️ Check if crypto deposit credited |
| `kraken_create_order` | Create buy/sell order |
| `kraken_get_order_status` | ⚠️ Check order execution status |
| `kraken_withdraw_crypto` | Withdraw crypto to wallet |
| `kraken_withdraw_fiat` | Withdraw fiat to bank |
| `kraken_get_withdrawal_status` | ⚠️ Check withdrawal progress |
| `kraken_get_orders` | Get order history |

### Wise Tools (crown-wise)

| Tool | Description |
|------|-------------|
| `wise_get_balances` | Get multi-currency balances |
| `wise_get_rate` | Get exchange rate |
| `wise_create_transfer` | Transfer to recipient |
| `wise_get_transfer_status` | ⚠️ Check transfer progress (critical for waiting) |
| `wise_get_recipients` | List configured recipients |

**Note:** Tools marked with ⚠️ are critical for multi-step operations as they're used to wait for confirmations before proceeding to the next step.

## Testing the Setup

### Test 1: Simple Balance Check

```
User: What's my USDC balance?
Expected: Claude uses polygon_get_balance and returns your balance
```

### Test 2: Price Query

```
User: What's the current USDC to EUR rate on Kraken?
Expected: Claude uses kraken_get_ticker and returns the rate
```

### Test 3: Multi-Platform Query

```
User: Show me all my balances across Polygon, Kraken, and Wise
Expected: Claude uses tools from all three servers
```

### Test 4: Complex Operation (Dry Run)

```
User: If I wanted to top up my Revolut with 100 EUR, what would be the steps?
Expected: Claude explains the workflow without executing
```

## Troubleshooting

### Problem: MCP Servers Not Loading

**Symptoms**: Claude doesn't recognize Crown Hold tools

**Solutions**:
1. Check configuration file syntax (must be valid JSON)
2. Verify file paths are absolute and correct
3. Ensure MCP servers are built: `npm run build`
4. Check Claude Desktop logs (Help → View Logs)
5. Restart Claude Desktop completely

### Problem: Environment Variables Not Found

**Symptoms**: MCP tools return authentication errors

**Solutions**:
1. Verify `.env` files exist in each application directory
2. Check `.env` files contain all required variables
3. Ensure no typos in variable names
4. Restart Claude Desktop after changing `.env` files

### Problem: Tool Execution Fails

**Symptoms**: Claude calls tools but they return errors

**Solutions**:
1. Check API credentials are valid
2. Verify network connectivity
3. Check application logs in `/tmp/crown-hold-*.log`
4. Test API credentials directly with curl
5. Verify predefined addresses/recipients are correct

### Problem: Slow Response Times

**Symptoms**: Tools take a long time to respond

**Solutions**:
1. Check network latency to APIs
2. Verify API rate limits not exceeded
3. Check for any timeouts in logs
4. Consider caching frequently accessed data

## Advanced Configuration

### Development vs Production

For development with testnet/sandbox APIs:

```json
{
  "mcpServers": {
    "crown-polygon-dev": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Custom Environment Variables

Pass additional environment variables:

```json
{
  "mcpServers": {
    "crown-polygon": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "debug",
        "API_TIMEOUT": "30000"
      }
    }
  }
}
```

### Running MCP Servers with PM2

For better process management in production:

```json
{
  "mcpServers": {
    "crown-polygon": {
      "command": "pm2",
      "args": [
        "start",
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js",
        "--name",
        "crown-polygon"
      ]
    }
  }
}
```

## Claude Prompting Tips

### Be Specific with Amounts

```
✅ "Transfer exactly 100 USDC"
❌ "Transfer some USDC"
```

### Confirm Before Transactions

```
✅ "What would it cost to top up Revolut with 1000 EUR?"
Then: "Go ahead and do it"
❌ "Top up Revolut with 1000 EUR" (without understanding steps first)
```

### Check Balances First

```
✅ "Check my balances, then transfer 500 USDC to Kraken"
❌ "Transfer 500 USDC to Kraken" (might have insufficient balance)
```

### Ask for Explanations

```
✅ "Explain how you would convert USDC to EUR and send to Wise"
✅ "What fees would be involved in this operation?"
✅ "Break down the steps before we start"
```

## Claude Instructions

You can provide standing instructions to Claude about how to handle financial operations:

### Safety Instructions

Add to your Claude conversation:

```
When performing financial operations:
1. Always show me the plan before executing
2. Check balances before any transfer
3. Confirm final amounts including all fees
4. Log all transaction IDs
5. Ask for confirmation before any operation over 100 EUR
```

### Automation Instructions

For trusted operations:

```
You can automatically:
- Check balances anytime
- Get price quotes
- Calculate fees
- Show transaction history

But always ask before:
- Any transfer or trade
- Withdrawals
- Any operation over 50 EUR
```

## Monitoring & Logs

### Application Logs

MCP servers write logs to:
```
/tmp/crown-polygon.log
/tmp/crown-kraken.log
/tmp/crown-wise.log
```

View real-time logs:
```bash
tail -f /tmp/crown-polygon.log
```

### Claude Desktop Logs

Access via: Claude Desktop → Help → View Logs

Useful for debugging MCP server connection issues.

## Updating MCP Servers

When you update the Crown Hold code:

```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies
npm install

# 3. Rebuild
npm run build

# 4. Restart Claude Desktop
# (completely quit and reopen)
```

No need to change configuration unless paths change.

## Security Best Practices

1. **Separate Development and Production**
   - Use different API keys
   - Use testnet for development
   - Never test with real funds

2. **Review Tool Calls**
   - Check what Claude plans to do
   - Verify amounts and recipients
   - Confirm transaction details

3. **Set Limits**
   - Configure max amounts in `.env`
   - Use separate wallets for different purposes
   - Keep most funds in cold storage

4. **Monitor Regularly**
   - Review transaction logs
   - Check for unusual activity
   - Verify balances match expectations

5. **Keep Credentials Secure**
   - Never share `.env` files
   - Use read-only API keys when possible
   - Rotate keys periodically
   - Use 2FA where available

## Next Steps

- Read [Common Workflows](workflows.md) for usage examples
- Review [Environment Setup](environment-setup.md) for security
- Check [MCP Servers](mcp-servers.md) for technical details
