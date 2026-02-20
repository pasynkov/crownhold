# Kraken MCP Server

Model Context Protocol server for Kraken exchange interactions.

## Features

- Get account balances
- Get ticker prices for trading pairs
- Get crypto deposit addresses
- Create buy/sell orders
- Withdraw crypto to external wallets
- Withdraw fiat to bank accounts (Wise)
- View order history

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your credentials:
   - Kraken API key and secret
   - Wise withdrawal method name
   - Trading limits
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Test: `npm test`

## Tools Exposed

- `kraken_get_balances` - Get account balances
- `kraken_get_ticker` - Get ticker for trading pair
- `kraken_deposit_address` - Get crypto deposit address
- `kraken_withdraw_crypto` - Withdraw crypto
- `kraken_create_order` - Create buy/sell order
- `kraken_get_orders` - Get order history
- `kraken_withdraw_fiat` - Withdraw fiat to bank

## Security

- Never commit `.env` file
- Use API keys with minimal required permissions
- Set IP restrictions on API keys
- Configure `MAX_ORDER_SIZE_*` limits
- Only allow specific trading pairs

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

See [main documentation](../../docs/mcp-servers.md#kraken-mcp-server) for detailed implementation guide.
