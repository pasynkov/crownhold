# Deployment Guide

## Deployment Architecture: Local-Only

Crown Hold is designed to run **entirely on your local machine**. There are no servers to deploy, no cloud infrastructure to manage, and no network services to expose.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Your Local Machine                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Claude Desktop Application              │   │
│  │                                                   │   │
│  │  Spawns & Manages:                              │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  MCP Server Processes (Node.js)         │   │   │
│  │  │                                           │   │   │
│  │  │  • mcp-polygon  (stdio)                 │   │   │
│  │  │  • mcp-kraken   (stdio)                 │   │   │
│  │  │  • mcp-wise     (stdio)                 │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  File System:                                            │
│  • /Users/you/dev/crownhold/                            │
│    ├── applications/mcp-*/dist/main.js (executables)   │
│    ├── applications/mcp-*/.env (secrets, local only)   │
│    └── /tmp/crown-*.log (logs, local only)             │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
                    Outbound only:
                    • Polygon RPC
                    • Kraken API
                    • Wise API
```

## Why Local-Only?

### Security Benefits

1. **No Attack Surface**
   - No ports listening on network
   - No HTTP endpoints to exploit
   - No remote code execution vectors
   - Physical access required

2. **Credential Security**
   - Private keys never transmitted over network
   - API secrets stay on local filesystem
   - No man-in-the-middle attacks possible
   - No credential theft via network

3. **Zero Trust Architecture**
   - No authentication/authorization needed
   - No session management
   - No JWT tokens, API keys, OAuth flows
   - Machine access = full access

### Operational Benefits

1. **Simple Setup**
   - No server provisioning
   - No DNS configuration
   - No SSL certificates
   - No load balancers

2. **Zero Latency**
   - No network roundtrips
   - stdio communication is instant
   - Sub-millisecond tool calls

3. **No Infrastructure Costs**
   - No cloud hosting fees
   - No bandwidth charges
   - No server maintenance

4. **Easy Debugging**
   - All logs on local machine
   - Can attach debugger easily
   - No distributed tracing needed

## Process Lifecycle

### Startup Sequence

1. **User launches Claude Desktop**
   ```bash
   # macOS
   open -a "Claude"
   ```

2. **Claude Desktop reads config**
   ```json
   {
     "mcpServers": {
       "crown-polygon": {
         "command": "node",
         "args": ["/Users/you/dev/crownhold/applications/mcp-polygon/dist/main.js"]
       }
     }
   }
   ```

3. **Claude Desktop spawns MCP processes**
   ```bash
   # Claude Desktop internally runs:
   node /Users/you/dev/crownhold/applications/mcp-polygon/dist/main.js
   node /Users/you/dev/crownhold/applications/mcp-kraken/dist/main.js
   node /Users/you/dev/crownhold/applications/mcp-wise/dist/main.js
   ```

4. **stdio pipes established**
   ```
   Claude Desktop Process
      ├─> stdin pipe ─> MCP Polygon Process
      ├─< stdout pipe ─< MCP Polygon Process
      ├─> stdin pipe ─> MCP Kraken Process
      ├─< stdout pipe ─< MCP Kraken Process
      ├─> stdin pipe ─> MCP Wise Process
      └─< stdout pipe ─< MCP Wise Process
   ```

5. **MCP servers initialize**
   - Load environment variables from `.env`
   - Connect to external APIs (Polygon RPC, Kraken, Wise)
   - Send "ready" message to Claude Desktop
   - Wait for tool calls

### Operation

```
User types: "What's my USDC balance?"
   │
   ▼
Claude Desktop (interprets intent)
   │
   ▼
Writes JSON-RPC to polygon MCP stdin:
   {"jsonrpc":"2.0","method":"polygon_get_balance","id":1}
   │
   ▼
Polygon MCP reads from stdin
   │
   ▼
Executes: getBalance() function
   │
   ▼
Queries Polygon blockchain via RPC
   │
   ▼
Writes result to stdout:
   {"jsonrpc":"2.0","result":{"usdc":"5234.50"},"id":1}
   │
   ▼
Claude Desktop reads from stdout
   │
   ▼
Shows to user: "You have 5,234.50 USDC"
```

### Shutdown Sequence

1. **User quits Claude Desktop**
   ```bash
   # CMD+Q or File → Quit
   ```

2. **Claude Desktop sends termination signals**
   ```bash
   # SIGTERM to all MCP processes
   kill <polygon-pid>
   kill <kraken-pid>
   kill <wise-pid>
   ```

3. **MCP servers cleanup**
   - Close API connections
   - Flush logs
   - Exit gracefully

4. **Processes terminate**
   - All MCP server processes exit
   - No lingering processes
   - Clean shutdown

## File System Layout

### Production Setup

```
/Users/pasynkov/dev/crownhold/
│
├── applications/
│   ├── mcp-polygon/
│   │   ├── dist/
│   │   │   └── main.js              # Executable
│   │   ├── .env                      # Secrets (local only)
│   │   └── package.json
│   ├── mcp-kraken/
│   │   ├── dist/
│   │   │   └── main.js              # Executable
│   │   ├── .env                      # Secrets (local only)
│   │   └── package.json
│   └── mcp-wise/
│       ├── dist/
│       │   └── main.js              # Executable
│       ├── .env                      # Secrets (local only)
│       └── package.json
│
└── logs/ (or /tmp/)
    ├── crown-polygon.log             # Local logs
    ├── crown-kraken.log              # Local logs
    └── crown-wise.log                # Local logs
```

**Everything stays on your machine:**
- Executables: Local filesystem
- Configuration: Local `.env` files
- Logs: Local `/tmp/` or project directory
- Secrets: Never leave machine

## Network Communication

### Outbound Only

MCP servers make **outbound-only** connections to external APIs:

```
Your Machine (MCP Servers)
    │
    ├─> HTTPS → Polygon RPC (blockchain queries)
    ├─> HTTPS → Kraken API (exchange operations)
    └─> HTTPS → Wise API (transfer operations)
```

**No inbound connections ever:**
- No listening ports
- No incoming HTTP requests
- No webhooks (future enhancement only)
- Firewall can block all inbound traffic

### API Communication

```typescript
// Example: Polygon MCP making outbound request
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const balance = await provider.getBalance(address);
// ↑ Outbound HTTPS only, no inbound connections
```

## Security Considerations

### Physical Security

Since everything runs locally:

1. **Lock your computer** when away
2. **Encrypt your disk** (FileVault on macOS, BitLocker on Windows)
3. **Use strong password** for user account
4. **Enable screen saver lock** after 5 minutes idle
5. **Backup `.env` files** securely (password manager, encrypted USB)

### Network Security

1. **Firewall not required** (no inbound traffic)
2. **VPN recommended** when on public WiFi (protects outbound API calls)
3. **HTTPS only** for all external API calls
4. **No port forwarding** needed

### Process Security

1. **Run as regular user** (not root/admin)
2. **File permissions**: `.env` files should be 600 (read/write owner only)
3. **No shared access**: Don't run on multi-user systems
4. **Process isolation**: Each MCP server runs in separate Node.js process

## Monitoring

### Process Monitoring

Check if MCP servers are running:

```bash
# macOS/Linux
ps aux | grep "mcp-polygon\|mcp-kraken\|mcp-wise"

# Windows
tasklist | findstr node
```

### Log Monitoring

```bash
# Real-time log watching
tail -f /tmp/crown-polygon.log
tail -f /tmp/crown-kraken.log
tail -f /tmp/crown-wise.log

# Or combined
tail -f /tmp/crown-*.log
```

### Health Checks

MCP servers are healthy if:
- Process is running (check with `ps` or Task Manager)
- Logs show no errors
- Claude Desktop can call tools successfully

## Backup & Recovery

### What to Backup

**Critical (must backup):**
- `.env` files (contain all secrets)
- Wallet seed phrases (if not in .env, store separately)

**Optional:**
- Application source code (already in git)
- Configuration files (can recreate)
- Logs (for audit purposes only)

### Backup Strategy

```bash
# Create encrypted backup of secrets
tar czf - applications/*/.env | \
  gpg --symmetric --cipher-algo AES256 \
  > crown-hold-secrets-$(date +%Y%m%d).tar.gz.gpg

# Store in multiple locations:
# 1. Password manager (1Password, Bitwarden)
# 2. Encrypted USB drive (keep offline)
# 3. Secure cloud storage (encrypted before upload)
```

### Recovery Process

```bash
# Decrypt and restore
gpg --decrypt crown-hold-secrets-20260220.tar.gz.gpg | \
  tar xzf -

# Rebuild applications
npm install
npm run build

# Test
./scripts/check-structure.sh
```

## Troubleshooting

### MCP Servers Not Starting

**Symptoms:** Claude Desktop can't find tools

**Check:**
```bash
# Verify executables exist
ls -la applications/*/dist/main.js

# Verify .env files exist
ls -la applications/*/.env

# Try running manually
cd applications/mcp-polygon
node dist/main.js
# Should wait for stdin input
```

### Process Crashes

**Check logs:**
```bash
tail -50 /tmp/crown-polygon.log
```

**Common issues:**
- Missing `.env` variables
- Invalid API credentials
- Network connectivity issues
- Insufficient permissions

### High CPU/Memory Usage

**Check process stats:**
```bash
# macOS
top -pid $(pgrep -f mcp-polygon)

# Linux
top -p $(pgrep -f mcp-polygon)
```

**Usually caused by:**
- Too frequent polling
- Memory leaks (restart MCP servers)
- Large log files (rotate logs)

## Performance Optimization

### Minimize Restarts

MCP servers startup time:
- Initial load: ~1-2 seconds
- Keep Claude Desktop open to avoid restarts

### Log Rotation

```bash
# Rotate logs daily
0 0 * * * mv /tmp/crown-polygon.log /tmp/crown-polygon-$(date +\%Y\%m\%d).log

# Clean old logs (keep 30 days)
0 1 * * * find /tmp -name "crown-*.log" -mtime +30 -delete
```

### Resource Limits

Each MCP server typically uses:
- **Memory**: 50-100 MB
- **CPU**: <1% when idle, 5-10% when active
- **Disk**: Logs grow ~10 MB/day

Total resource usage is minimal.

## Future Enhancements

### Possible (but not required):

1. **Webhook support** (optional, requires local HTTP server)
   - Would break local-only model
   - Use ngrok for tunneling if needed
   - Not recommended for security

2. **Remote monitoring** (optional)
   - Push metrics to external service
   - Still no inbound connections
   - One-way communication only

3. **Background service** (optional)
   - Run MCP servers as system services
   - Start on boot, always available
   - Still local-only execution

**For now: Keep it simple. Local-only is best.**

## Comparison: Local vs Remote Deployment

| Aspect | Local (Crown Hold) | Remote (Typical App) |
|--------|-------------------|---------------------|
| Security | Physical access required | Network attacks possible |
| Setup | Copy files, run | Server provision, DNS, SSL |
| Cost | $0 | $20-100+/month |
| Latency | <1ms | 50-200ms |
| Scalability | Single user only | Multi-user |
| Maintenance | Minimal | Regular updates, patching |
| Privacy | 100% local | Data transmitted |
| Authentication | Physical access | Complex auth systems |

**For personal finance management: Local-only is the right choice.**

## Summary

Crown Hold's local-only architecture provides:

✅ **Maximum security** - no network exposure
✅ **Simple operation** - just run Claude Desktop
✅ **Zero cost** - no hosting fees
✅ **Fast performance** - no network overhead
✅ **Complete privacy** - data never leaves machine
✅ **Easy debugging** - everything local

This is the right architectural choice for a personal financial management tool handling sensitive credentials and operations.
