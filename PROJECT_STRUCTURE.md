# Crown Hold Project Structure

```
crownhold/
│
├── README.md                      # Project overview and quick start
├── CLAUDE.md                      # Instructions for Claude Code
├── PROJECT_STRUCTURE.md           # This file
├── LICENSE                        # MIT License
├── .gitignore                     # Git ignore rules
├── package.json                   # Monorepo configuration
│
├── docs/                          # 📚 Documentation
│   ├── architecture.md            # System architecture and design
│   ├── deployment.md              # Local deployment architecture
│   ├── mcp-servers.md             # MCP servers technical docs
│   ├── claude-setup.md            # Claude Desktop setup guide
│   ├── environment-setup.md       # Environment variables guide
│   ├── workflows.md               # Common usage workflows
│   └── plan/                      # 📋 Development Plan
│       ├── README.md              # Plan overview
│       ├── phase-0-research.md    # API research & library selection
│       ├── phase-1-mcp-mocks.md   # MCP infrastructure + mocks
│       ├── phase-2-polygon.md     # Polygon integration
│       ├── phase-3-kraken.md      # Kraken integration
│       ├── phase-4-wise.md        # Wise integration
│       ├── phase-5-e2e.md         # End-to-end testing
│       └── phase-6-production.md  # Production hardening
│
├── scripts/                       # 🛠️ Utility scripts
│   └── setup-env.js               # Environment setup script
│
└── applications/                  # 🚀 MCP Server Applications
    │
    ├── mcp-polygon/              # Polygon blockchain MCP server
    │   ├── README.md
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example          # Environment template
    │   ├── .env                  # ❌ Not in git (your secrets)
    │   ├── src/
    │   │   ├── main.ts           # Application entry point
    │   │   ├── app.module.ts     # NestJS root module
    │   │   ├── mcp/              # MCP protocol implementation
    │   │   │   ├── mcp.module.ts
    │   │   │   ├── mcp.service.ts
    │   │   │   └── mcp.controller.ts
    │   │   ├── polygon/          # Polygon blockchain logic
    │   │   │   ├── polygon.module.ts
    │   │   │   ├── polygon.service.ts
    │   │   │   └── polygon.types.ts
    │   │   ├── config/           # Configuration
    │   │   │   └── configuration.ts
    │   │   └── common/           # Shared utilities
    │   │       ├── logger.ts
    │   │       └── validators.ts
    │   ├── test/                 # Tests
    │   │   ├── unit/
    │   │   └── integration/
    │   └── dist/                 # ❌ Build output (not in git)
    │
    ├── mcp-kraken/               # Kraken exchange MCP server
    │   ├── README.md
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example
    │   ├── .env                  # ❌ Not in git
    │   ├── src/
    │   │   ├── main.ts
    │   │   ├── app.module.ts
    │   │   ├── mcp/
    │   │   │   ├── mcp.module.ts
    │   │   │   ├── mcp.service.ts
    │   │   │   └── mcp.controller.ts
    │   │   ├── kraken/           # Kraken API logic
    │   │   │   ├── kraken.module.ts
    │   │   │   ├── kraken.service.ts
    │   │   │   └── kraken.types.ts
    │   │   ├── config/
    │   │   │   └── configuration.ts
    │   │   └── common/
    │   │       ├── logger.ts
    │   │       └── validators.ts
    │   ├── test/
    │   │   ├── unit/
    │   │   └── integration/
    │   └── dist/                 # ❌ Build output
    │
    └── mcp-wise/                 # Wise transfers MCP server
        ├── README.md
        ├── package.json
        ├── tsconfig.json
        ├── .env.example
        ├── .env                  # ❌ Not in git
        ├── src/
        │   ├── main.ts
        │   ├── app.module.ts
        │   ├── mcp/
        │   │   ├── mcp.module.ts
        │   │   ├── mcp.service.ts
        │   │   └── mcp.controller.ts
        │   ├── wise/             # Wise API logic
        │   │   ├── wise.module.ts
        │   │   ├── wise.service.ts
        │   │   └── wise.types.ts
        │   ├── config/
        │   │   └── configuration.ts
        │   └── common/
        │       ├── logger.ts
        │       └── validators.ts
        ├── test/
        │   ├── unit/
        │   └── integration/
        └── dist/                 # ❌ Build output
```

## Key Directories

### 📁 Root Level
- Configuration files for monorepo
- Main documentation (README, CLAUDE.md)
- Git and npm configuration

### 📚 docs/
Complete documentation for:
- Architecture and design decisions
- MCP server implementation details
- Setup and configuration guides
- Usage workflows and examples

### 🛠️ scripts/
Utility scripts for:
- Environment setup
- Testing helpers
- Deployment automation

### 🚀 applications/
Three NestJS MCP servers:

#### mcp-polygon
- Blockchain wallet management
- USDC transfers
- Gas estimation
- Transaction history

#### mcp-kraken
- Exchange account management
- Crypto trading
- Deposits and withdrawals
- Order management

#### mcp-wise
- International transfers
- Multi-currency balances
- Exchange rates
- Recipient management

## File Naming Conventions

### TypeScript Files
- `*.module.ts` - NestJS modules
- `*.service.ts` - Business logic services
- `*.controller.ts` - Request handlers
- `*.types.ts` - TypeScript type definitions
- `*.spec.ts` - Test files

### Configuration Files
- `.env.example` - Environment template (in git)
- `.env` - Actual secrets (NOT in git)
- `tsconfig.json` - TypeScript configuration
- `package.json` - npm package configuration

### Documentation
- `README.md` - Module/package overview
- `*.md` - Markdown documentation

## Important Notes

### ✅ Committed to Git
- Source code (src/)
- Tests (test/)
- Documentation (docs/)
- Example configs (.env.example)
- Package configurations

### ❌ NOT Committed to Git
- Environment files (.env)
- Build outputs (dist/)
- Dependencies (node_modules/)
- Logs (*.log)
- IDE configs (.idea/, .vscode/)

## Build Outputs

Each application builds to `dist/` directory:
```
applications/mcp-*/dist/
├── main.js              # Compiled entry point
├── *.js                 # Compiled source
└── *.js.map             # Source maps
```

## Log Files

Logs written to `/tmp/`:
```
/tmp/crown-polygon.log
/tmp/crown-kraken.log
/tmp/crown-wise.log
```

## Next Steps

1. Implement NestJS applications in each `applications/mcp-*` directory
2. Create `.env.example` files with all required variables
3. Add comprehensive tests
4. Set up CI/CD pipeline
5. Deploy and configure Claude Desktop

See [CLAUDE.md](CLAUDE.md) for detailed development instructions.
