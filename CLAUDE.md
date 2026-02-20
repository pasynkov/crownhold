# Crown Hold - AI-Powered Financial Management Solution

## Project Overview

Crown Hold is an AI-driven financial management system that enables natural language interactions with multiple financial platforms through Model Context Protocol (MCP) servers. The system orchestrates complex multi-step financial operations across cryptocurrency, exchanges, and traditional banking services.

## Core Concept

Users interact with Claude Desktop using natural language to perform financial operations:
- Simple queries: "What's my balance?"
- Complex operations: "Top up my Revolut with 1000 EUR"

Complex operations are automatically orchestrated through multiple services:
1. Get USDC rate on Polygon
2. Fund Kraken account with USDC
3. Transfer from Kraken to Wise
4. Transfer from Wise to Revolut

## Architecture

### Technology Stack
- **Monorepo Structure**: All MCP server applications in a single repository
- **Framework**: NestJS for building MCP servers
- **Protocol**: Model Context Protocol (MCP) for Claude integration
- **Services Integration**:
  - Polygon blockchain (USDC and other tokens)
  - Kraken (cryptocurrency exchange)
  - Wise (international money transfers)

### Project Structure

```
crownhold/
├── CLAUDE.md                      # This file - project instructions for Claude
├── README.md                      # Project documentation
├── docs/                          # All project documentation
│   ├── architecture.md            # Architecture overview
│   ├── mcp-servers.md             # MCP servers description
│   ├── claude-setup.md            # Claude Desktop setup instructions
│   ├── environment-setup.md       # Environment variables and secrets
│   └── workflows.md               # Common operation workflows
├── applications/                  # Monorepo with NestJS applications
│   ├── mcp-polygon/              # Polygon blockchain MCP server
│   │   ├── src/
│   │   ├── .env.example
│   │   └── package.json
│   ├── mcp-kraken/               # Kraken exchange MCP server
│   │   ├── src/
│   │   ├── .env.example
│   │   └── package.json
│   └── mcp-wise/                 # Wise transfers MCP server
│       ├── src/
│       ├── .env.example
│       └── package.json
└── package.json                   # Monorepo root package.json
```

## MCP Servers

Each MCP server exposes specific financial operations as tools that Claude can use:

### mcp-polygon
- Check USDC balance
- Check other token balances
- Get current token prices/rates
- Transfer USDC to predefined wallets
- Transaction history

### mcp-kraken
- Check account balances
- Get trading pairs and rates
- Deposit/withdraw crypto
- Execute trades
- View order history

### mcp-wise
- Check account balance
- Get exchange rates
- Transfer to predefined recipients
- View transaction history

## Security & Configuration

### Environment Variables
All sensitive information is stored in `.env` files:
- Private keys and wallet addresses (Polygon)
- API keys and secrets (Kraken, Wise)
- Predefined recipient accounts
- Webhook URLs (if needed)

### Security Principles
1. **No secrets in code**: All credentials in `.env` files
2. **Predefined recipients**: Only allow transfers to pre-configured accounts
3. **Transaction limits**: Set maximum amounts for automated operations
4. **Audit logging**: Log all operations for review
5. **Environment separation**: Separate configs for development/production

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- Follow NestJS best practices
- Comprehensive error handling
- Input validation for all MCP tools
- Detailed logging

### MCP Tool Design
Each tool should:
- Have clear, descriptive names
- Include comprehensive JSON schemas
- Validate all inputs
- Return structured, parseable responses
- Handle errors gracefully
- Log operations for audit

### Testing
- Unit tests for business logic
- Integration tests for external APIs
- Mock external services in tests
- Test error scenarios

## Claude Desktop Integration

### Installation
1. Build all MCP servers
2. Configure Claude Desktop with MCP server paths
3. Set up environment variables
4. Test each MCP server independently
5. Test complex multi-service workflows

### Usage Patterns

**Simple Queries:**
```
User: What's my Polygon wallet balance?
Claude: Uses mcp-polygon → get_balance tool
```

**Complex Operations:**
```
User: Top up my Revolut with 1000 EUR
Claude:
1. Uses mcp-polygon → get_usdc_rate
2. Calculates required USDC amount
3. Uses mcp-kraken → deposit_crypto (USDC from Polygon)
4. Uses mcp-kraken → sell_crypto (USDC → EUR)
5. Uses mcp-kraken → withdraw_fiat (to Wise)
6. Uses mcp-wise → transfer (to Revolut)
7. Reports success/failure at each step
```

## Workflow Examples

### Example 1: Balance Check
```
User: Show me all my balances
Claude:
- Polygon wallet: 5,000 USDC
- Kraken account: 2,500 EUR, 0.15 ETH
- Wise account: 1,200 GBP
```

### Example 2: Currency Conversion
```
User: Convert 1000 USDC to EUR and send to my Wise account
Claude:
1. Check USDC balance on Polygon
2. Transfer USDC to Kraken
3. Sell USDC for EUR on Kraken
4. Withdraw EUR to Wise
5. Confirm transfer completion
```

## Future Enhancements

- Support for additional cryptocurrencies
- Integration with more exchanges
- Support for DeFi protocols
- Automated portfolio rebalancing
- Price alerts and notifications
- Historical analytics and reporting
- Mobile app integration

## Contributing

When working on this project:
1. Update documentation in `docs/` for any architectural changes
2. Keep `.env.example` files up to date
3. Test MCP tools individually before integration
4. Document new workflows in `docs/workflows.md`
5. Follow security principles strictly
6. Add integration tests for new features

## Important Notes for Claude

### Transaction Execution Rules

- **Always confirm** before executing financial transactions
- **Validate amounts** and recipients before operations
- **Check balances** before transfers
- **WAIT for confirmations** before proceeding to next step (see below)
- **Log all operations** for audit trail
- **Handle errors gracefully** and provide clear feedback
- **Never expose** private keys or API secrets in responses
- **Verify** exchange rates before large transfers
- **Consider fees** in amount calculations

### ⚠️ CRITICAL: Asynchronous Operations

**Financial operations are NOT instantaneous. You MUST wait for confirmations.**

#### Waiting Requirements

When executing multi-step operations:

1. **After blockchain transfer**: Wait for transaction confirmation
   ```
   ❌ DON'T DO THIS:
   - Transfer USDC to Kraken
   - Immediately try to trade (will fail - funds not credited yet!)

   ✅ DO THIS:
   - Transfer USDC to Kraken
   - Poll polygon_get_transaction_status() until "confirmed"
   - Poll kraken_check_deposit() until funds appear
   - Then proceed with trade
   ```

2. **After exchange deposit**: Wait for exchange to credit funds
   - Polygon → Kraken: 3-10 minutes after tx confirmation
   - Poll deposit status every 10 seconds
   - Verify balance increased before trading

3. **After trade execution**: Wait for order to fill
   - Market orders: Usually seconds, but check status
   - Limit orders: May take longer
   - Poll order status until "filled"

4. **After withdrawal initiation**: Wait for processing
   - Kraken → Wise: 1-3 business days
   - Wise → Revolut: 1-24 hours
   - Poll withdrawal/transfer status periodically
   - Keep user informed of progress

#### Status Checking Tools

Use these tools to check operation status:

**Polygon:**
- `polygon_get_transaction_status(tx_hash)` → `pending | confirming | confirmed | failed`

**Kraken:**
- `kraken_check_deposit(tx_hash, currency)` → Check if deposit credited
- `kraken_get_order_status(order_id)` → Check trade status
- `kraken_get_withdrawal_status(withdrawal_id)` → Check withdrawal status

**Wise:**
- `wise_get_transfer_status(transfer_id)` → Check transfer progress

#### Polling Pattern

Use exponential backoff when polling:

```
Initial interval: 2-5 seconds
Max interval: 30-60 seconds
Timeout: Operation-specific (see architecture.md)

Example:
1. Call status check
2. If not complete, wait 5 seconds
3. Call again
4. If not complete, wait 7 seconds
5. Call again
6. If not complete, wait 10 seconds
... continue with increasing intervals
```

#### User Communication

**Keep user informed during waits:**

```
✓ Step 1: Transferred 1,087 USDC to Kraken
  TX: 0x456...def

⏳ Waiting for blockchain confirmations (usually 2-3 minutes)...
  Current: 5/12 confirmations

  [Update every 30 seconds]
  Current: 12/12 confirmations
✓ Confirmed!

⏳ Waiting for Kraken to credit deposit (usually 3-5 minutes)...
  Checking balance every 10 seconds...

  [Update when credited]
✓ Deposit credited! 1,087 USDC available

✓ Step 2: Selling USDC for EUR...
  [Continue with next steps...]
```

#### Timeout Handling

Each operation has maximum wait time:
- Polygon confirmation: 10 minutes
- Kraken deposit: 15 minutes
- Kraken order: 2 minutes
- Kraken withdrawal: 24 hours
- Wise transfer: 48 hours

If timeout exceeded:
1. **Don't fail silently**
2. Report current status to user
3. Provide transaction IDs for manual checking
4. Suggest checking back later or contacting support

#### Partial Failure Recovery

If operation fails mid-way:

```
Example: Failed at step 3 of 5-step operation

✓ Step 1: Transferred USDC to Kraken (completed)
✓ Step 2: Traded USDC for EUR (completed)
❌ Step 3: Withdrawal to Wise (failed)

Current state:
- Your funds are safe on Kraken (1,000 EUR)
- Withdrawal ID: WD-123
- You can manually complete the withdrawal at kraken.com

Would you like me to retry the withdrawal?
```

#### Never Assume Instant Completion

```
❌ WRONG APPROACH:
User: Top up Revolut with 1000 EUR
Claude:
- Transfer USDC → Kraken ✓
- Trade USDC → EUR ✓
- Withdraw to Wise ✓
- Transfer to Revolut ✓
Done in 10 seconds! <-- IMPOSSIBLE

✅ CORRECT APPROACH:
User: Top up Revolut with 1000 EUR
Claude:
- Transfer USDC → Kraken... waiting 3 min... ✓
- Trade USDC → EUR... waiting 15 sec... ✓
- Withdraw to Wise... waiting 2 hours... ✓
- Transfer to Revolut... waiting 6 hours... ✓
Total time: ~8 hours (this is normal for bank transfers)
```
