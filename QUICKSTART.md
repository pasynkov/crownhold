# Quick Start Guide

Get Crown Hold up and running in 15 minutes.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ npm 9+ installed
- ✅ Claude Desktop installed
- ✅ Git installed

## Step 1: Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd crownhold

# Install dependencies
npm install
```

## Step 2: Verify Structure

```bash
# Run structure check
./scripts/check-structure.sh
```

You should see all green checkmarks for documentation.

## Step 3: Understand the Project

Read these in order:

1. **README.md** - Project overview
2. **CLAUDE.md** - Development instructions
3. **docs/architecture.md** - System design
4. **PROJECT_STRUCTURE.md** - File organization

## Step 4: Implement MCP Servers

This is the main development work. For each application:

### mcp-polygon

```bash
cd applications/mcp-polygon

# Initialize NestJS app
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express ethers dotenv

# Create source structure
mkdir -p src/{mcp,polygon,config,common}

# Create .env.example
cat > .env.example << 'EOF'
POLYGON_RPC_URL=
POLYGON_CHAIN_ID=137
WALLET_PRIVATE_KEY=
WALLET_ADDRESS=
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDC_DECIMALS=6
KRAKEN_DEPOSIT_ADDRESS=
MAX_TRANSFER_AMOUNT_USDC=10000
LOG_LEVEL=info
EOF

# Implement according to docs/mcp-servers.md
```

### mcp-kraken

```bash
cd applications/mcp-kraken

# Initialize
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express kraken-api dotenv

# Create structure
mkdir -p src/{mcp,kraken,config,common}

# Create .env.example
# (see docs/environment-setup.md)

# Implement according to docs/mcp-servers.md
```

### mcp-wise

```bash
cd applications/mcp-wise

# Initialize
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express axios dotenv

# Create structure
mkdir -p src/{mcp,wise,config,common}

# Create .env.example
# (see docs/environment-setup.md)

# Implement according to docs/mcp-servers.md
```

## Step 5: Configure Environment

```bash
# From project root
npm run setup:env

# Edit each .env file with your credentials
# See docs/environment-setup.md for details
```

## Step 6: Build

```bash
# Build all applications
npm run build

# Or build individually
npm run build:polygon
npm run build:kraken
npm run build:wise
```

## Step 7: Test

```bash
# Test each MCP server
npm run test:polygon
npm run test:kraken
npm run test:wise

# Or test all
npm test
```

## Step 8: Configure Claude Desktop

**Important:** MCP servers run as **local processes** (not network services).
- Communication via stdio (stdin/stdout)
- No network ports opened
- Cannot be accessed remotely
- Completely secure and private

Edit Claude Desktop configuration:

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add:
```json
{
  "mcpServers": {
    "crown-polygon": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"]
    },
    "crown-kraken": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-kraken/dist/main.js"]
    },
    "crown-wise": {
      "command": "node",
      "args": ["/Users/pasynkov/dev/crownhold/applications/mcp-wise/dist/main.js"]
    }
  }
}
```

**This tells Claude Desktop to:**
1. Spawn these Node.js processes locally when it starts
2. Communicate with them via stdio (not HTTP)
3. Terminate them when Claude Desktop closes

See [docs/claude-setup.md](docs/claude-setup.md) and [docs/deployment.md](docs/deployment.md) for complete details.

## Step 9: Start Claude Desktop

```bash
# Restart Claude Desktop completely
# CMD+Q (macOS) or close all windows

# Open Claude Desktop again
```

## Step 10: Test Integration

Open Claude Desktop and try:

```
"What MCP tools do you have available?"

"What's my USDC balance?"

"Show me all my balances"
```

## Development Workflow

### Daily Development

```bash
# Start development mode
npm run dev

# In separate terminals for each:
npm run dev:polygon
npm run dev:kraken
npm run dev:wise

# Watch logs
tail -f /tmp/crown-polygon.log
```

### Making Changes

```bash
# 1. Edit code
code applications/mcp-polygon/src/polygon/polygon.service.ts

# 2. Rebuild
npm run build:polygon

# 3. Restart Claude Desktop
# CMD+Q and reopen

# 4. Test
# Ask Claude to use the updated tool
```

### Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- polygon.service.spec.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Troubleshooting

### Problem: Claude doesn't see MCP servers

**Solution:**
1. Check Claude Desktop config path is correct
2. Verify MCP servers are built: `ls applications/*/dist/main.js`
3. Check logs: `tail -f ~/Library/Logs/Claude/mcp*.log`
4. Restart Claude Desktop completely

### Problem: Environment variables not found

**Solution:**
1. Verify .env files exist: `ls applications/*/.env`
2. Check .env file syntax (no spaces around =)
3. Rebuild after changing .env: `npm run build`

### Problem: API authentication fails

**Solution:**
1. Verify API keys are correct
2. Check API key permissions
3. Test APIs directly with curl
4. Check for IP restrictions

### Need Help?

- 📖 Read [docs/troubleshooting.md](docs/troubleshooting.md)
- 🐛 Check [GitHub Issues](https://github.com/yourusername/crown-hold/issues)
- 💬 See [docs/workflows.md](docs/workflows.md) for usage examples

## Next Steps

Once everything is working:

1. **Test with small amounts first**
   - Use testnet for Polygon
   - Try small transfers (1-10 EUR)
   - Verify fees are reasonable

2. **Set conservative limits**
   - Keep `MAX_TRANSFER_AMOUNT_*` low initially
   - Increase gradually as you gain confidence

3. **Monitor operations**
   - Review logs regularly
   - Track all transactions
   - Set up alerts

4. **Read workflows documentation**
   - [docs/workflows.md](docs/workflows.md) has examples
   - Practice simple operations first
   - Build to complex workflows

5. **Contribute**
   - Report bugs
   - Suggest improvements
   - Share your workflows

## Cheat Sheet

```bash
# Install everything
npm install

# Setup environment
npm run setup:env

# Build everything
npm run build

# Test everything
npm test

# Check structure
./scripts/check-structure.sh

# View logs
tail -f /tmp/crown-*.log

# Clean everything
npm run clean

# Start fresh
npm run clean && npm install && npm run build
```

## Security Reminders

- ⚠️ Never commit .env files
- ⚠️ Use separate API keys for dev/prod
- ⚠️ Keep most funds in cold storage
- ⚠️ Test with small amounts first
- ⚠️ Review all transactions
- ⚠️ Set up 2FA everywhere
- ⚠️ Monitor for unusual activity

## Success Criteria

You're ready when:

- ✅ All MCP servers build successfully
- ✅ Claude Desktop sees all tools
- ✅ Balance checks work
- ✅ Price queries work
- ✅ Test transactions succeed
- ✅ Logs are clean
- ✅ You understand the workflow

Happy building! 👑
