# Wise MCP Server

Model Context Protocol server for Wise (TransferWise) interactions.

## Features

- Get multi-currency account balances
- Get exchange rates
- Create transfers to predefined recipients
- Check transfer status
- List configured recipients

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your credentials:
   - Wise API token
   - Wise profile ID
   - Recipient IDs (Revolut, etc.)
   - Transfer limits per currency
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Test: `npm test`

## Tools Exposed

- `wise_get_balances` - Get multi-currency balances
- `wise_get_rate` - Get exchange rate
- `wise_create_transfer` - Transfer to recipient
- `wise_get_transfer_status` - Check transfer status
- `wise_get_recipients` - List configured recipients

## Security

- Never commit `.env` file
- Use API token with minimal permissions
- Only configure trusted recipients
- Set `MAX_TRANSFER_AMOUNT_*` limits per currency
- Only allow specific currencies

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Documentation

See [main documentation](../../docs/mcp-servers.md#wise-mcp-server) for detailed implementation guide.
