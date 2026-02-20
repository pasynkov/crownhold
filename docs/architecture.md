# Crown Hold Architecture

## System Overview

Crown Hold uses the Model Context Protocol (MCP) to expose financial operations as tools that Claude AI can use during conversations. The system is designed as a set of independent MCP servers, each responsible for a specific financial platform.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│                   (Claude Desktop App)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Natural Language
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                       Claude AI                             │
│              (understands intent, plans actions)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ MCP Protocol
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                   MCP Server Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Polygon   │  │   Kraken   │  │    Wise    │           │
│  │ MCP Server │  │ MCP Server │  │ MCP Server │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
         │ API Calls     │ API Calls     │ API Calls
         │               │               │
┌────────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
│   Polygon     │ │   Kraken    │ │    Wise     │
│  Blockchain   │ │     API     │ │     API     │
└───────────────┘ └─────────────┘ └─────────────┘
```

## Deployment Model: Local-Only Execution

**CRITICAL ARCHITECTURAL DECISION: All MCP servers run locally.**

### Why Local-Only?

1. **Security**: No network exposure = no remote attacks
2. **Privacy**: Credentials never leave your machine
3. **Simplicity**: No need for authentication, HTTPS, load balancers
4. **Compliance**: All data stays on local filesystem
5. **Zero latency**: No network overhead between Claude and MCP servers

### Communication Protocol

MCP servers communicate with Claude Desktop via **stdio (standard input/output)**:

```
Claude Desktop Process
    │
    ├─> Spawns: node /path/to/mcp-polygon/dist/main.js
    │   └─> stdin/stdout communication
    │
    ├─> Spawns: node /path/to/mcp-kraken/dist/main.js
    │   └─> stdin/stdout communication
    │
    └─> Spawns: node /path/to/mcp-wise/dist/main.js
        └─> stdin/stdout communication
```

**No HTTP endpoints. No WebSockets. No network ports.**

### Process Lifecycle

1. User opens Claude Desktop
2. Claude Desktop reads `claude_desktop_config.json`
3. For each MCP server:
   - Spawns Node.js process locally
   - Establishes stdio pipes
   - MCP server initializes and waits for commands
4. User makes request → Claude calls MCP tools via stdio
5. MCP server executes → returns result via stdout
6. Claude Desktop closes → all MCP processes terminate

### Security Implications

**Local execution provides:**
- No firewall rules needed
- No SSL/TLS certificates
- No authentication middleware
- No rate limiting from network attacks
- No DDoS vulnerability
- No credential exposure over network

**Physical security required:**
- Access to machine = access to MCP servers
- Keep machine locked when away
- Encrypt disk for additional protection
- Regular security updates

## Components

### 1. Claude AI Layer
- Interprets user intent from natural language
- Plans multi-step operations
- Calls appropriate MCP tools in correct order via stdio
- Handles errors and provides user feedback
- Confirms operations before execution

### 2. MCP Server Layer (Local Processes)

Each MCP server is a standalone NestJS application that:
- Implements MCP protocol
- Exposes domain-specific tools
- Handles authentication with external APIs
- Validates inputs
- Manages rate limiting
- Logs all operations

#### mcp-polygon
**Responsibility**: Interact with Polygon blockchain

**Tools Exposed**:
- `get_wallet_balance` - Get USDC and token balances
- `get_token_price` - Get current token prices
- `transfer_usdc` - Transfer USDC to predefined address
- `get_transaction_history` - View recent transactions
- `estimate_gas` - Estimate gas for transaction

**External Dependencies**:
- ethers.js for blockchain interaction
- Polygon RPC endpoint
- Wallet private key (from .env)

#### mcp-kraken
**Responsibility**: Interact with Kraken exchange

**Tools Exposed**:
- `get_balances` - Get account balances
- `get_ticker` - Get current prices for trading pairs
- `deposit_address` - Get deposit address for crypto
- `withdraw_crypto` - Withdraw crypto to external wallet
- `create_order` - Create buy/sell order
- `get_orders` - Get open/closed orders
- `withdraw_fiat` - Withdraw fiat to bank account

**External Dependencies**:
- Kraken REST API
- API key and secret (from .env)

#### mcp-wise
**Responsibility**: Interact with Wise for international transfers

**Tools Exposed**:
- `get_balances` - Get multi-currency balances
- `get_exchange_rate` - Get current exchange rate
- `create_transfer` - Transfer to predefined recipient
- `get_transfer_status` - Check transfer status
- `get_recipients` - List configured recipients

**External Dependencies**:
- Wise API
- API token (from .env)
- Predefined recipient IDs

### 3. External Services

#### Polygon Blockchain
- Smart contract interactions
- USDC token transfers
- Transaction signing
- Gas estimation

#### Kraken Exchange
- Cryptocurrency trading
- Fiat deposits/withdrawals
- Market data
- Order management

#### Wise (formerly TransferWise)
- International money transfers
- Multi-currency accounts
- Exchange rates
- Recipient management

## Money Flow Direction

**CRITICAL: Crown Hold supports ONLY unidirectional money flow:**

```
┌─────────────┐
│   Polygon   │ USDC
│  (Wallet)   │
└──────┬──────┘
       │
       ├─> Kraken (deposit)
       └─> Other Wallets (wife, friends, savings)

┌──────┴──────┐
│   Kraken    │ USDC → EUR
│ (Exchange)  │
└──────┬──────┘
       │
       └─> Wise (withdrawal ONLY)

┌──────┴──────┐
│    Wise     │ EUR
│ (Transfer)  │
└──────┬──────┘
       │
       └─> Recipients (Revolut, banks, people)
```

**No backward flow:**
- ❌ Kraken → Polygon (not supported)
- ❌ Wise → Kraken (not supported)
- ❌ Recipients → Wise (external process, not in system)

This unidirectional design ensures:
- Clear audit trail
- No circular dependencies
- Simpler error handling
- Predictable state management

## Data Flow

### Example: "Top up my Revolut with 1000 EUR"

1. **User Input** → Claude Desktop
   ```
   User types: "Top up my Revolut with 1000 EUR"
   ```

2. **Claude Planning** → Claude AI analyzes and plans
   ```
   Intent: Transfer 1000 EUR to Revolut
   Plan:
   - Check USDC balance on Polygon
   - Get current USDC/EUR rate
   - Calculate required USDC amount (+ fees)
   - Transfer USDC from Polygon to Kraken
   - Sell USDC for EUR on Kraken
   - Withdraw EUR to Wise
   - Transfer EUR from Wise to Revolut
   ```

3. **Tool Execution** → MCP servers called in sequence
   ```
   mcp-polygon.get_wallet_balance()
   → Response: 5000 USDC available

   mcp-kraken.get_ticker(pair: "USDCEUR")
   → Response: 1 USDC = 0.92 EUR

   Calculation: Need ~1087 USDC (+ 2% buffer for fees)

   mcp-polygon.transfer_usdc(
     to: KRAKEN_DEPOSIT_ADDRESS,
     amount: 1087
   )
   → Response: tx_hash: 0x123...

   Wait for confirmation...

   mcp-kraken.create_order(
     type: "market",
     side: "sell",
     pair: "USDCEUR",
     volume: 1087
   )
   → Response: order_id: ABC-123, filled: 1000 EUR

   mcp-kraken.withdraw_fiat(
     amount: 1000,
     currency: "EUR",
     destination: "wise"
   )
   → Response: withdrawal_id: WD-456

   mcp-wise.create_transfer(
     recipient: "revolut",
     amount: 1000,
     currency: "EUR"
   )
   → Response: transfer_id: TR-789
   ```

4. **User Feedback** → Claude reports results
   ```
   "Done! I've topped up your Revolut with 1000 EUR.

   Summary:
   - Transferred 1087 USDC from Polygon to Kraken
   - Sold for 1000 EUR (rate: 0.92 EUR/USDC)
   - Withdrew to Wise and sent to Revolut
   - Total fees: ~15 EUR

   Polygon TX: 0x123...
   Wise transfer: TR-789"
   ```

## Security Architecture

### Authentication & Authorization

1. **Environment-based secrets**
   - All API keys in `.env` files
   - Never logged or exposed
   - Separate dev/prod environments

2. **Predefined recipients**
   - All transfer destinations configured in `.env`
   - No arbitrary addresses allowed
   - Validation before every transfer

3. **Transaction limits**
   - Maximum amounts per operation
   - Configurable per environment
   - Enforced at MCP server level

### Audit & Logging

Every operation logged with:
- Timestamp
- Tool called
- Parameters (sanitized)
- Result/error
- User identifier (if applicable)

Logs stored for audit and debugging.

## Asynchronous Operations & State Management

### Critical Concept: Non-Atomic Operations

**Financial operations are NOT instantaneous.** This is a fundamental architectural constraint that must be handled properly.

### Operation Timelines

| Operation | Typical Duration | Confirmation Required |
|-----------|------------------|----------------------|
| Polygon transfer | 30 seconds - 5 minutes | Block confirmations (12+) |
| Kraken deposit detection | 3-10 minutes after tx confirmation | Exchange verification |
| Kraken trade execution | Seconds - 1 minute | Order filled |
| Kraken withdrawal initiation | Instant | Withdrawal queued |
| Kraken → Wise transfer | 1-3 business days | Bank processing |
| Wise → Revolut transfer | 1-24 hours | Bank processing |

### State Tracking Requirements

Each operation must expose:

1. **Transaction ID** - Unique identifier for tracking
2. **Status** - Current state of operation
3. **Polling endpoint** - Way to check current status
4. **Estimated completion** - When to expect completion

### Status State Machine

```
┌─────────────────────────────────────────────────────┐
│                  Operation Lifecycle                │
└─────────────────────────────────────────────────────┘

INITIATED
    │
    ├─> PENDING ──> CONFIRMING ──> CONFIRMED ──> COMPLETED
    │       │            │              │
    └───────┴────────────┴──────────────┴───> FAILED
                                               │
                                               └─> REQUIRES_ACTION
```

### Polling Strategy

**Exponential Backoff Pattern:**
```typescript
async waitForConfirmation(txId: string, maxWaitMs: number = 600000) {
  const startTime = Date.now();
  let interval = 2000; // Start with 2 seconds
  const maxInterval = 30000; // Max 30 seconds between polls

  while (Date.now() - startTime < maxWaitMs) {
    const status = await this.checkStatus(txId);

    if (status === 'COMPLETED') {
      return { success: true, status };
    }

    if (status === 'FAILED') {
      throw new Error('Operation failed');
    }

    // Exponential backoff
    await sleep(interval);
    interval = Math.min(interval * 1.5, maxInterval);
  }

  throw new Error('Timeout waiting for confirmation');
}
```

### Multi-Step Workflow Management

For complex operations like "Top up Revolut", Claude must:

1. **Execute step**
2. **Wait for confirmation**
3. **Verify success** before next step
4. **Handle partial failures**

**Example Flow with Waiting:**
```
User: Top up Revolut with 1000 EUR

Step 1: Transfer USDC from Polygon to Kraken
  ├─> polygon_transfer_usdc() → tx_hash
  ├─> WAIT: polygon_get_transaction_status(tx_hash)
  │   ├─> Poll every 5 seconds
  │   └─> Wait for "confirmed" status
  └─> ✓ Confirmed after 2 minutes

Step 2: Wait for Kraken deposit
  ├─> WAIT: kraken_check_deposit(tx_hash)
  │   ├─> Poll every 10 seconds
  │   └─> Wait for balance increase
  └─> ✓ Credited after 5 minutes

Step 3: Sell USDC for EUR
  ├─> kraken_create_order() → order_id
  ├─> WAIT: kraken_get_order_status(order_id)
  │   ├─> Poll every 2 seconds
  │   └─> Wait for "filled" status
  └─> ✓ Filled after 15 seconds

Step 4: Withdraw EUR to Wise
  ├─> kraken_withdraw_fiat() → withdrawal_id
  ├─> WAIT: kraken_get_withdrawal_status(withdrawal_id)
  │   ├─> Poll every 30 seconds
  │   └─> Wait for "processed" status
  └─> ✓ Processed after 2 hours

Step 5: Transfer EUR to Revolut
  ├─> wise_create_transfer() → transfer_id
  ├─> WAIT: wise_get_transfer_status(transfer_id)
  │   ├─> Poll every 60 seconds
  │   └─> Wait for "completed" status
  └─> ✓ Completed after 4 hours

Total time: ~6-8 hours
```

### Required Status Check Tools

Each MCP server must implement status checking:

**Polygon:**
- `polygon_get_transaction_status(tx_hash)` - Check blockchain confirmation status
- Returns: `pending | confirming | confirmed | failed`

**Kraken:**
- `kraken_check_deposit(tx_hash, currency)` - Check if deposit credited
- `kraken_get_order_status(order_id)` - Check trade execution
- `kraken_get_withdrawal_status(withdrawal_id)` - Check withdrawal status
- Returns: `pending | processing | completed | failed`

**Wise:**
- `wise_get_transfer_status(transfer_id)` - Check transfer status
- Returns: `processing | funds_converted | outgoing_payment_sent | completed | failed`

### User Communication During Waits

Claude should keep user informed:

```
Claude:
✓ Step 1: Transferring 1,087 USDC to Kraken
  TX: 0x456...def
  Status: Pending...

⏳ Waiting for blockchain confirmations (usually 2-3 minutes)...
  Current confirmations: 3/12

  [30 seconds later]
  Current confirmations: 8/12

  [1 minute later]
✓ Confirmed! (12 confirmations)

⏳ Step 2: Waiting for Kraken to credit deposit (usually 3-5 minutes)...
  Checking balance every 10 seconds...

  [3 minutes later]
✓ Deposit credited! 1,087 USDC now available

✓ Step 3: Selling USDC for EUR...
  Order executed in 8 seconds

[Continue with next steps...]
```

### Timeout Handling

Each operation should have appropriate timeouts:

```typescript
const TIMEOUTS = {
  polygon_confirmation: 10 * 60 * 1000,      // 10 minutes
  kraken_deposit: 15 * 60 * 1000,            // 15 minutes
  kraken_order: 2 * 60 * 1000,               // 2 minutes
  kraken_withdrawal: 24 * 60 * 60 * 1000,    // 24 hours
  wise_transfer: 48 * 60 * 60 * 1000,        // 48 hours
};
```

If timeout exceeded:
1. Log current status
2. Provide transaction ID to user
3. Suggest manual checking
4. Don't automatically retry (user should investigate)

### Idempotency

All operations must be idempotent:
- Re-checking status should not cause side effects
- Multiple status calls with same ID return consistent results
- Failed operations can be safely retried

### Error Recovery

**Partial Failure Scenarios:**

1. **Funds stuck in transit**
   ```
   Problem: Transfer confirmed but not credited
   Solution: Provide tx_hash, contact support
   ```

2. **Operation timeout**
   ```
   Problem: Status unknown after timeout
   Solution: Continue monitoring, provide manual check instructions
   ```

3. **Intermediate failure**
   ```
   Problem: Failed at step 3 of 5, funds on Kraken
   Solution: Report current state, suggest manual completion
   ```

### State Persistence

For long-running operations (hours/days), consider:
- Storing operation state in local database
- Webhook support for status updates
- Background job for status checking
- User notifications when complete

**Future Enhancement: Operation Queue**
```typescript
interface OperationState {
  id: string;
  type: 'top_up_revolut';
  status: 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  startedAt: Date;
  estimatedCompletion: Date;
  steps: StepState[];
}
```

## Error Handling

### Principles
1. **Fail fast**: Validate inputs before external calls
2. **Graceful degradation**: Return partial results when possible
3. **Clear errors**: Provide actionable error messages
4. **Retry logic**: Automatic retry for transient failures
5. **Rollback awareness**: Track partial completions, never silently fail

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Insufficient balance | Check before operation, return clear error |
| API timeout | Retry 3 times with exponential backoff |
| Invalid address | Validate against whitelist, reject |
| Network error | Queue for retry, notify user |
| Rate limit | Wait and retry, respect limits |
| Transaction failed | Log details, return error, no retry |

## Scalability Considerations

### Current Architecture
- Synchronous operations
- Single instance per MCP server
- Direct API calls

### Future Enhancements
- Message queue for async operations
- Transaction status tracking
- Multiple instances with load balancing
- Caching for market data
- Webhook support for notifications

## Technology Choices

### NestJS
- Modular architecture
- Built-in dependency injection
- Easy testing
- TypeScript support
- Large ecosystem

### MCP Protocol
- Native Claude integration
- Standardized tool definitions
- Type-safe communication
- Easy to extend

### TypeScript
- Type safety
- Better IDE support
- Catch errors at compile time
- Self-documenting code

## Development Environment

```
┌─────────────────┐
│   Development   │
│   (localhost)   │
│                 │
│  MCP Servers    │
│  - Testnet APIs │
│  - Small limits │
│  - Verbose logs │
└─────────────────┘

┌─────────────────┐
│   Production    │
│   (deployed)    │
│                 │
│  MCP Servers    │
│  - Mainnet APIs │
│  - Real limits  │
│  - Error logs   │
└─────────────────┘
```

## Monitoring & Observability

### Metrics
- Transaction success/failure rates
- API response times
- Error rates by type
- Balance changes over time

### Alerts
- Failed transactions
- API errors
- Unusual activity
- Low balances

### Dashboards
- Real-time balance overview
- Recent transactions
- Fee analysis
- Performance metrics

## Future Architecture

### Planned Enhancements
1. **Database layer** for transaction history
2. **Message queue** for async processing
3. **Webhook handlers** for real-time updates
4. **GraphQL API** for unified data access
5. **Mobile apps** with direct API access
6. **Portfolio analytics** service
7. **Price alert** service
8. **Automated strategies** service

### Microservices Evolution
```
Current: Monorepo with 3 MCP servers
Future:  Monorepo with 10+ specialized services
         - Core MCP servers (Polygon, Kraken, Wise)
         - Analytics service
         - Notification service
         - Strategy service
         - Audit service
         - API gateway
```
