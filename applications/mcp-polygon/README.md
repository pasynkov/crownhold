# Polygon MCP Server

Model Context Protocol server for Polygon blockchain interactions.

## Features

- Get USDC and MATIC balances
- Get token prices
- Transfer USDC to predefined addresses (Kraken)
- View transaction history
- Estimate gas fees

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your credentials:
   - Polygon RPC URL
   - Wallet private key
   - Kraken deposit address
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Test: `npm test`

## Tools Exposed

- `polygon_get_balance` - Get wallet balances
- `polygon_get_token_price` - Get token price
- `polygon_transfer_usdc` - Transfer USDC
- `polygon_get_transactions` - View transaction history
- `polygon_estimate_gas` - Estimate gas fees

## Security

- Never commit `.env` file
- Use separate wallet for this service
- Keep most funds in cold storage
- Set reasonable `MAX_TRANSFER_AMOUNT_USDC`

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

See [main documentation](../../docs/mcp-servers.md#polygon-mcp-server) for detailed implementation guide.
