# 👑 Crown Hold

AI-Powered Financial Management Solution

## Overview

Crown Hold is an intelligent financial orchestration platform that allows you to manage your cryptocurrency and traditional finance accounts through natural language conversations with Claude AI.

Simply ask Claude to perform complex financial operations, and Crown Hold will automatically coordinate actions across multiple platforms:
- **Polygon** blockchain for cryptocurrency operations
- **Kraken** exchange for crypto trading
- **Wise** for international transfers

## Key Features

- 🤖 **Natural Language Control**: Just talk to Claude naturally
- 🔗 **Multi-Platform Orchestration**: Seamlessly coordinate operations across services
- 🔒 **Security First**: All credentials and recipients pre-configured
- 🏠 **Local-Only Execution**: MCP servers run locally, never exposed to network
- 📊 **Complete Visibility**: Check balances across all platforms
- 🚀 **Complex Workflows**: Execute multi-step operations with a single request

## Example Use Cases

```
"What's my USDC balance on Polygon?"

"Top up my Revolut with 1000 EUR"
→ Automatically: Get rates → Transfer USDC → Wait for confirmations →
  Sell on Kraken → Withdraw to Wise → Wait for bank transfer →
  Transfer to Revolut → Wait for completion
  (Total time: ~2-3 days due to bank processing)

"Convert 500 USDC to EUR and keep it in Kraken"

"What's the current USDC/EUR rate?"
```

## Important: Operations Are Asynchronous

⏳ **Financial operations take time and require waiting between steps:**

- **Blockchain transfers**: 2-5 minutes for confirmations
- **Exchange deposits**: 3-10 minutes for crediting
- **Trades**: Seconds to minutes
- **Bank withdrawals**: 1-3 business days
- **International transfers**: Hours to days

Claude will automatically wait for each step to complete before proceeding to the next one, keeping you informed of progress along the way.

## Architecture

Crown Hold is built as a monorepo containing multiple NestJS applications, each implementing the Model Context Protocol (MCP) to expose financial operations as tools for Claude:

```
┌─────────────────┐
│  Claude Desktop │
│    (You talk)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │   MCP   │
    └────┬────┘
         │
    ┌────┴─────────────────────┐
    │                          │
┌───┴────┐  ┌────────┐  ┌─────┴──┐
│Polygon │  │ Kraken │  │  Wise  │
│  MCP   │  │  MCP   │  │  MCP   │
└───┬────┘  └────┬───┘  └────┬───┘
    │            │           │
┌───┴────┐  ┌────┴───┐  ┌────┴───┐
│Polygon │  │ Kraken │  │  Wise  │
│  API   │  │  API   │  │  API   │
└────────┘  └────────┘  └────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- Claude Desktop
- API keys for Kraken and Wise
- Polygon wallet with private key

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd crownhold
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy example env files
   cp applications/mcp-polygon/.env.example applications/mcp-polygon/.env
   cp applications/mcp-kraken/.env.example applications/mcp-kraken/.env
   cp applications/mcp-wise/.env.example applications/mcp-wise/.env

   # Edit .env files with your credentials
   ```

3. **Build MCP Servers**
   ```bash
   npm run build
   ```

4. **Configure Claude Desktop**

   Add MCP servers to Claude Desktop configuration (see `docs/claude-setup.md`)

5. **Start Talking!**

   Open Claude Desktop and start managing your finances naturally

## Documentation

### Architecture & Design
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [MCP Servers Description](docs/mcp-servers.md)

### Setup & Configuration
- [Claude Desktop Setup](docs/claude-setup.md)
- [Environment Configuration](docs/environment-setup.md)
- [Common Workflows](docs/workflows.md)

### Development Plan
- [Phase-by-Phase Development Plan](docs/plan/README.md)
- [Phase 0: Research & API Analysis](docs/plan/phase-0-research.md)
- [Phase 1: MCP Infrastructure + Mocks](docs/plan/phase-1-mcp-mocks.md)
- [Phase 2-6: Integration & Production](docs/plan/)

## Security

⚠️ **Important Security Notes:**

- **Local-only execution**: MCP servers run on your machine only, no network exposure
- **No remote access**: Cannot be accessed from outside your computer
- **stdio communication**: Claude Desktop communicates via stdin/stdout, not HTTP
- Never commit `.env` files
- Use separate API keys for development and production
- Configure transaction limits in production
- Only add trusted recipient addresses
- Regularly review transaction logs
- Use read-only API keys when possible
- Physical access to machine required for operation

## Project Structure

```
crownhold/
├── applications/          # MCP server applications
│   ├── mcp-polygon/      # Polygon blockchain integration
│   ├── mcp-kraken/       # Kraken exchange integration
│   └── mcp-wise/         # Wise transfer integration
├── docs/                 # Documentation
└── CLAUDE.md            # Instructions for Claude Code
```

## Development

```bash
# Install dependencies
npm install

# Build all applications
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Roadmap

- [ ] Basic MCP servers implementation
- [ ] Claude Desktop integration
- [ ] Transaction logging and audit
- [ ] Additional cryptocurrency support
- [ ] DeFi protocol integration
- [ ] Mobile app
- [ ] Portfolio analytics

## Contributing

This is a personal financial management tool. If you're interested in the concept, feel free to fork and adapt for your needs.

## License

MIT

## Disclaimer

This software handles real financial transactions. Use at your own risk. Always test with small amounts first. The authors are not responsible for any financial losses.

---

Built with ❤️ using [Claude](https://claude.ai) and [Model Context Protocol](https://modelcontextprotocol.io)
