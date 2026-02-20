# MCP Servers Technical Documentation

This document provides technical details about each MCP server implementation.

## Model Context Protocol (MCP)

MCP is a protocol that allows AI models like Claude to interact with external tools and services. Each MCP server:

1. **Exposes tools** - Functions that Claude can call
2. **Defines schemas** - JSON schemas for tool parameters
3. **Handles requests** - Validates inputs and executes operations
4. **Returns results** - Structured responses for Claude to interpret

### Communication Model: stdio (Standard Input/Output)

**Crown Hold MCP servers communicate via stdio, NOT HTTP:**

```typescript
// MCP Server runs as local process
// Reads JSON-RPC messages from stdin
// Writes responses to stdout
// No HTTP server, no network ports

process.stdin.on('data', (data) => {
  const request = JSON.parse(data);
  const result = await handleRequest(request);
  process.stdout.write(JSON.stringify(result));
});
```

**Key characteristics:**
- **No network exposure**: Only accessible to Claude Desktop on same machine
- **No authentication needed**: Physical access to machine is authentication
- **Simple deployment**: Just run `node main.js`
- **Fast communication**: No network overhead
- **Automatic lifecycle**: Claude Desktop manages process lifecycle

## Common Patterns

All Crown Hold MCP servers follow these patterns:

### 1. Tool Structure

```typescript
interface MCPTool {
  name: string;           // Tool identifier (e.g., "polygon_get_balance")
  description: string;    // What the tool does
  inputSchema: object;    // JSON schema for parameters
  handler: Function;      // Implementation function
}
```

### 2. Error Handling

```typescript
interface MCPResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 3. Validation

- Input validation using JSON schemas
- Amount limits enforcement
- Address/recipient whitelisting
- Rate limiting

### 4. Logging

- Request logging (sanitized)
- Response logging
- Error logging with stack traces
- Audit trail for transactions

## Polygon MCP Server

### Overview

Manages interactions with Polygon blockchain for USDC and other tokens.

### Technology Stack

- **NestJS** - Application framework
- **ethers.js** - Ethereum/Polygon interaction
- **dotenv** - Environment configuration
- **winston** - Logging

### Tools Exposed

#### 1. polygon_get_balance

Get wallet balances for USDC and MATIC.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "includeTokens": {
      "type": "boolean",
      "description": "Include other token balances"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "usdc": "5234.50",
    "matic": "12.45",
    "tokens": []
  }
}
```

**Implementation:**
```typescript
async getBalance(includeTokens = false) {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

  // Get MATIC balance
  const maticBalance = await provider.getBalance(wallet.address);

  // Get USDC balance
  const usdcContract = new ethers.Contract(
    process.env.USDC_CONTRACT_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  const usdcBalance = await usdcContract.balanceOf(wallet.address);

  return {
    address: wallet.address,
    usdc: ethers.formatUnits(usdcBalance, 6),
    matic: ethers.formatEther(maticBalance)
  };
}
```

#### 2. polygon_get_token_price

Get current token price from DEX or price oracle.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "token": {
      "type": "string",
      "description": "Token symbol (e.g., USDC, MATIC)"
    },
    "currency": {
      "type": "string",
      "description": "Target currency (e.g., EUR, USD)",
      "default": "USD"
    }
  },
  "required": ["token"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "USDC",
    "currency": "EUR",
    "price": "0.92",
    "timestamp": "2026-02-20T10:30:00Z"
  }
}
```

#### 3. polygon_transfer_usdc

Transfer USDC to predefined address.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "recipient": {
      "type": "string",
      "description": "Recipient identifier (e.g., 'kraken')",
      "enum": ["kraken"]
    },
    "amount": {
      "type": "number",
      "description": "Amount in USDC"
    }
  },
  "required": ["recipient", "amount"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x123...",
    "from": "0xYour...",
    "to": "0xKraken...",
    "amount": "1000.00",
    "gasUsed": "0.48",
    "status": "pending"
  }
}
```

**Implementation:**
```typescript
async transferUSDC(recipient: string, amount: number) {
  // Validate recipient
  const recipientAddress = this.getRecipientAddress(recipient);
  if (!recipientAddress) {
    throw new Error(`Unknown recipient: ${recipient}`);
  }

  // Validate amount
  if (amount > parseFloat(process.env.MAX_TRANSFER_AMOUNT_USDC)) {
    throw new Error(`Amount exceeds maximum: ${process.env.MAX_TRANSFER_AMOUNT_USDC}`);
  }

  // Check balance
  const balance = await this.getBalance();
  if (parseFloat(balance.data.usdc) < amount) {
    throw new Error('Insufficient balance');
  }

  // Create transaction
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

  const usdcContract = new ethers.Contract(
    process.env.USDC_CONTRACT_ADDRESS,
    [
      'function transfer(address to, uint256 amount) returns (bool)'
    ],
    wallet
  );

  const amountInUnits = ethers.parseUnits(amount.toString(), 6);

  // Estimate gas
  const gasEstimate = await usdcContract.transfer.estimateGas(
    recipientAddress,
    amountInUnits
  );

  // Send transaction
  const tx = await usdcContract.transfer(
    recipientAddress,
    amountInUnits,
    {
      gasLimit: gasEstimate * 120n / 100n // 20% buffer
    }
  );

  // Log transaction
  this.logger.log(`USDC transfer initiated: ${tx.hash}`);

  return {
    transactionHash: tx.hash,
    from: wallet.address,
    to: recipientAddress,
    amount: amount.toString(),
    gasUsed: ethers.formatUnits(gasEstimate, 'gwei'),
    status: 'pending'
  };
}
```

#### 4. polygon_get_transactions

Get recent transaction history.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Number of transactions to return",
      "default": 10,
      "maximum": 100
    }
  }
}
```

#### 5. polygon_estimate_gas

Estimate gas for a potential transaction.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "recipient": {
      "type": "string"
    },
    "amount": {
      "type": "number"
    }
  },
  "required": ["recipient", "amount"]
}
```

#### 6. polygon_get_transaction_status

**⚠️ CRITICAL TOOL: Used for waiting/polling transaction confirmations**

Check the status of a blockchain transaction.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "transactionHash": {
      "type": "string",
      "description": "Transaction hash to check"
    }
  },
  "required": ["transactionHash"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x123...",
    "status": "confirmed",
    "confirmations": 12,
    "blockNumber": 12345678,
    "gasUsed": "45000",
    "timestamp": "2026-02-20T10:30:00Z"
  }
}
```

**Status Values:**
- `pending` - Transaction submitted, not yet in a block
- `confirming` - In a block, waiting for confirmations (< 12)
- `confirmed` - Has required confirmations (12+)
- `failed` - Transaction failed

**Implementation:**
```typescript
async getTransactionStatus(txHash: string) {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);

  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return {
      transactionHash: txHash,
      status: 'pending',
      confirmations: 0
    };
  }

  // Get current block number
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber + 1;

  // Determine status
  let status: string;
  if (receipt.status === 0) {
    status = 'failed';
  } else if (confirmations < 12) {
    status = 'confirming';
  } else {
    status = 'confirmed';
  }

  return {
    transactionHash: txHash,
    status,
    confirmations,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: new Date().toISOString()
  };
}
```

**Usage in Multi-Step Operations:**
```typescript
// After transfer
const transfer = await polygon_transfer_usdc('kraken', 1000);
const txHash = transfer.data.transactionHash;

// Wait for confirmation
while (true) {
  const status = await polygon_get_transaction_status(txHash);

  if (status.data.status === 'confirmed') {
    break; // Proceed to next step
  }

  if (status.data.status === 'failed') {
    throw new Error('Transaction failed');
  }

  // Wait before next check
  await sleep(5000); // 5 seconds
}
```

### Configuration

Required environment variables (see `.env.example`):
- `POLYGON_RPC_URL`
- `WALLET_PRIVATE_KEY`
- `WALLET_ADDRESS`
- `USDC_CONTRACT_ADDRESS`
- `KRAKEN_DEPOSIT_ADDRESS`
- `MAX_TRANSFER_AMOUNT_USDC`

## Kraken MCP Server

### Overview

Manages interactions with Kraken cryptocurrency exchange.

### Technology Stack

- **NestJS** - Application framework
- **kraken-api** - Kraken API client
- **dotenv** - Environment configuration
- **winston** - Logging

### Tools Exposed

#### 1. kraken_get_balances

Get all account balances.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "EUR": "2150.30",
    "USDC": "208.73",
    "BTC": "0.0023"
  }
}
```

#### 2. kraken_get_ticker

Get current price for trading pair.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "pair": {
      "type": "string",
      "description": "Trading pair (e.g., USDCEUR)"
    }
  },
  "required": ["pair"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pair": "USDCEUR",
    "bid": "0.9200",
    "ask": "0.9205",
    "last": "0.9203",
    "volume": "1234567.89",
    "timestamp": "2026-02-20T10:30:00Z"
  }
}
```

#### 3. kraken_deposit_address

Get deposit address for cryptocurrency.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "asset": {
      "type": "string",
      "description": "Asset code (e.g., USDC)"
    },
    "network": {
      "type": "string",
      "description": "Network (e.g., Polygon)",
      "default": "Polygon"
    }
  },
  "required": ["asset"]
}
```

#### 4. kraken_create_order

Create buy or sell order.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "pair": {
      "type": "string",
      "description": "Trading pair"
    },
    "type": {
      "type": "string",
      "enum": ["buy", "sell"]
    },
    "ordertype": {
      "type": "string",
      "enum": ["market", "limit"],
      "default": "market"
    },
    "volume": {
      "type": "number",
      "description": "Order volume"
    },
    "price": {
      "type": "number",
      "description": "Limit price (for limit orders)"
    }
  },
  "required": ["pair", "type", "volume"]
}
```

**Implementation:**
```typescript
async createOrder(params: {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: number;
  price?: number;
}) {
  // Validate trading pair
  if (!process.env.ALLOWED_TRADING_PAIRS.includes(params.pair)) {
    throw new Error(`Trading pair not allowed: ${params.pair}`);
  }

  // Validate volume limits
  const maxSize = parseFloat(
    process.env[`MAX_ORDER_SIZE_${params.pair.slice(-3)}`]
  );
  if (params.volume > maxSize) {
    throw new Error(`Order size exceeds maximum: ${maxSize}`);
  }

  // Create order via Kraken API
  const result = await this.krakenClient.api('AddOrder', {
    pair: params.pair,
    type: params.type,
    ordertype: params.ordertype,
    volume: params.volume.toString(),
    price: params.price?.toString(),
  });

  this.logger.log(`Order created: ${result.txid}`);

  return {
    orderId: result.txid[0],
    pair: params.pair,
    type: params.type,
    volume: params.volume,
    price: params.price,
    status: 'open'
  };
}
```

#### 5. kraken_withdraw_fiat

Withdraw fiat currency to bank account.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "asset": {
      "type": "string",
      "description": "Currency (e.g., EUR)"
    },
    "amount": {
      "type": "number"
    },
    "destination": {
      "type": "string",
      "description": "Withdrawal method name",
      "enum": ["wise"]
    }
  },
  "required": ["asset", "amount", "destination"]
}
```

#### 6. kraken_check_deposit

**⚠️ CRITICAL TOOL: Used for waiting until crypto deposit is credited**

Check if a crypto deposit has been credited to Kraken account.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "transactionHash": {
      "type": "string",
      "description": "Blockchain transaction hash"
    },
    "currency": {
      "type": "string",
      "description": "Currency deposited (e.g., USDC)"
    }
  },
  "required": ["transactionHash", "currency"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credited": true,
    "amount": "1087.00",
    "currency": "USDC",
    "creditedAt": "2026-02-20T10:35:00Z"
  }
}
```

**Implementation:**
```typescript
async checkDeposit(txHash: string, currency: string) {
  // Get recent deposits
  const deposits = await this.krakenClient.api('DepositStatus', {
    asset: currency,
    method: 'Polygon' // or detect from txHash
  });

  // Find deposit matching this transaction
  const deposit = deposits.result.find(d =>
    d.txid === txHash || d.info === txHash
  );

  if (!deposit) {
    return {
      credited: false,
      status: 'not_found'
    };
  }

  return {
    credited: deposit.status === 'Success',
    amount: deposit.amount,
    currency: currency,
    status: deposit.status,
    creditedAt: deposit.time ? new Date(deposit.time * 1000).toISOString() : null
  };
}
```

#### 7. kraken_get_order_status

**⚠️ CRITICAL TOOL: Used for waiting until trade order is filled**

Get the status of a specific order.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "orderId": {
      "type": "string",
      "description": "Order ID or txid"
    }
  },
  "required": ["orderId"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ABC-123",
    "status": "closed",
    "type": "sell",
    "pair": "USDCEUR",
    "volume": "1087.00",
    "volumeExecuted": "1087.00",
    "price": "0.9200",
    "cost": "1000.04",
    "fee": "2.50",
    "closedAt": "2026-02-20T10:36:00Z"
  }
}
```

**Status Values:**
- `pending` - Order submitted, not yet executed
- `open` - Partially filled
- `closed` - Fully filled
- `canceled` - Order canceled
- `expired` - Order expired

#### 8. kraken_get_withdrawal_status

**⚠️ CRITICAL TOOL: Used for checking fiat withdrawal progress**

Check the status of a withdrawal.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "withdrawalId": {
      "type": "string",
      "description": "Withdrawal ID or refid"
    }
  },
  "required": ["withdrawalId"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": "WD-789",
    "status": "success",
    "asset": "EUR",
    "amount": "997.54",
    "fee": "1.00",
    "destination": "Wise",
    "submittedAt": "2026-02-20T10:37:00Z",
    "completedAt": "2026-02-21T14:22:00Z"
  }
}
```

**Status Values:**
- `pending` - Withdrawal requested, awaiting approval
- `processing` - Being processed by Kraken
- `on_hold` - On hold for review
- `success` - Completed successfully
- `failure` - Failed
- `canceled` - Canceled

**Implementation:**
```typescript
async getWithdrawalStatus(withdrawalId: string) {
  const withdrawals = await this.krakenClient.api('WithdrawStatus', {
    asset: 'EUR', // or get from withdrawal record
    method: 'wise'
  });

  const withdrawal = withdrawals.result.find(w =>
    w.refid === withdrawalId
  );

  if (!withdrawal) {
    throw new Error(`Withdrawal ${withdrawalId} not found`);
  }

  return {
    withdrawalId: withdrawal.refid,
    status: withdrawal.status,
    asset: withdrawal.asset,
    amount: withdrawal.amount,
    fee: withdrawal.fee,
    submittedAt: new Date(withdrawal.time * 1000).toISOString(),
    completedAt: withdrawal.status === 'success'
      ? new Date().toISOString()
      : null
  };
}
```

### Configuration

Required environment variables:
- `KRAKEN_API_KEY`
- `KRAKEN_API_SECRET`
- `WISE_WITHDRAWAL_NAME`
- `MAX_ORDER_SIZE_USDC`
- `MAX_ORDER_SIZE_EUR`
- `ALLOWED_TRADING_PAIRS`

## Wise MCP Server

### Overview

Manages interactions with Wise for international money transfers.

### Technology Stack

- **NestJS** - Application framework
- **axios** - HTTP client for Wise API
- **dotenv** - Environment configuration
- **winston** - Logging

### Tools Exposed

#### 1. wise_get_balances

Get multi-currency account balances.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "currency": "EUR",
        "amount": "1500.00"
      },
      {
        "currency": "GBP",
        "amount": "800.00"
      },
      {
        "currency": "USD",
        "amount": "250.00"
      }
    ]
  }
}
```

#### 2. wise_get_rate

Get exchange rate between currencies.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "description": "Source currency"
    },
    "target": {
      "type": "string",
      "description": "Target currency"
    }
  },
  "required": ["source", "target"]
}
```

#### 3. wise_create_transfer

Create transfer to predefined recipient.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "recipient": {
      "type": "string",
      "description": "Recipient identifier",
      "enum": ["revolut"]
    },
    "amount": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "reference": {
      "type": "string",
      "description": "Payment reference"
    }
  },
  "required": ["recipient", "amount", "currency"]
}
```

**Implementation:**
```typescript
async createTransfer(params: {
  recipient: string;
  amount: number;
  currency: string;
  reference?: string;
}) {
  // Get recipient ID
  const recipientId = process.env[`${params.recipient.toUpperCase()}_RECIPIENT_ID`];
  if (!recipientId) {
    throw new Error(`Unknown recipient: ${params.recipient}`);
  }

  // Validate amount
  const maxAmount = parseFloat(
    process.env[`MAX_TRANSFER_AMOUNT_${params.currency}`]
  );
  if (params.amount > maxAmount) {
    throw new Error(`Amount exceeds maximum: ${maxAmount} ${params.currency}`);
  }

  // Create quote
  const quote = await this.wiseClient.post('/v3/profiles/:profileId/quotes', {
    sourceCurrency: params.currency,
    targetCurrency: params.currency,
    sourceAmount: params.amount,
    targetAccount: recipientId
  });

  // Create transfer
  const transfer = await this.wiseClient.post('/v1/transfers', {
    targetAccount: recipientId,
    quoteUuid: quote.data.id,
    customerTransactionId: uuidv4(),
    details: {
      reference: params.reference || 'Crown Hold transfer'
    }
  });

  // Fund transfer
  await this.wiseClient.post(`/v3/profiles/:profileId/transfers/${transfer.data.id}/payments`, {
    type: 'BALANCE'
  });

  this.logger.log(`Transfer created: ${transfer.data.id}`);

  return {
    transferId: transfer.data.id,
    recipient: params.recipient,
    amount: params.amount,
    currency: params.currency,
    fee: quote.data.fee,
    status: 'processing'
  };
}
```

#### 4. wise_get_transfer_status

**⚠️ CRITICAL TOOL: Used for checking transfer progress**

Check status of a transfer with detailed progress information.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "transferId": {
      "type": "string",
      "description": "Transfer ID from wise_create_transfer"
    }
  },
  "required": ["transferId"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "TR-012",
    "status": "outgoing_payment_sent",
    "sourceAmount": "996.54",
    "sourceCurrency": "EUR",
    "targetAmount": "996.54",
    "targetCurrency": "EUR",
    "recipient": "revolut",
    "rate": "1.0000",
    "fee": "2.50",
    "createdAt": "2026-02-21T14:30:00Z",
    "estimatedDelivery": "2026-02-21T22:30:00Z",
    "completedAt": null,
    "statusTimeline": [
      {
        "status": "processing",
        "timestamp": "2026-02-21T14:30:00Z"
      },
      {
        "status": "funds_converted",
        "timestamp": "2026-02-21T14:31:00Z"
      },
      {
        "status": "outgoing_payment_sent",
        "timestamp": "2026-02-21T18:15:00Z"
      }
    ]
  }
}
```

**Status Values (in order):**
- `processing` - Transfer created, being processed
- `funds_converted` - Exchange completed (if applicable)
- `outgoing_payment_sent` - Payment sent to recipient's bank
- `bounced_back` - Payment returned (error state)
- `funds_refunded` - Refunded to source (error state)
- `completed` - Successfully delivered to recipient

**Implementation:**
```typescript
async getTransferStatus(transferId: string) {
  // Get transfer details
  const transfer = await this.wiseClient.get(
    `/v1/transfers/${transferId}`
  );

  // Get delivery estimate
  const delivery = await this.wiseClient.get(
    `/v1/delivery-estimates/${transfer.data.id}`
  );

  return {
    transferId: transfer.data.id,
    status: transfer.data.status,
    sourceAmount: transfer.data.sourceValue,
    sourceCurrency: transfer.data.sourceCurrency,
    targetAmount: transfer.data.targetValue,
    targetCurrency: transfer.data.targetCurrency,
    rate: transfer.data.rate,
    fee: transfer.data.fee,
    createdAt: transfer.data.created,
    estimatedDelivery: delivery.data.estimatedDelivery,
    completedAt: transfer.data.status === 'completed'
      ? transfer.data.completed
      : null
  };
}
```

**Usage Pattern:**
```typescript
// After creating transfer
const transfer = await wise_create_transfer({
  recipient: 'revolut',
  amount: 996.54,
  currency: 'EUR'
});

// Poll status until complete
while (true) {
  const status = await wise_get_transfer_status(transfer.data.transferId);

  if (status.data.status === 'completed') {
    break; // Done!
  }

  if (['bounced_back', 'funds_refunded'].includes(status.data.status)) {
    throw new Error(`Transfer failed: ${status.data.status}`);
  }

  // Update user with progress
  console.log(`Status: ${status.data.status}`);

  // Wait before next check
  await sleep(60000); // 60 seconds for bank transfers
}
```

**Polling Recommendations:**
- Initial check: Immediately after creation
- Subsequent checks: Every 60 seconds
- Timeout: 48 hours (bank transfers can take 1-2 days)
- Show estimated delivery time to user

#### 5. wise_get_recipients

List configured recipients.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {}
}
```

### Configuration

Required environment variables:
- `WISE_API_TOKEN`
- `WISE_PROFILE_ID`
- `REVOLUT_RECIPIENT_ID`
- `MAX_TRANSFER_AMOUNT_EUR`
- `MAX_TRANSFER_AMOUNT_GBP`
- `MAX_TRANSFER_AMOUNT_USD`

## Development Guidelines

### Adding New Tools

1. **Define tool schema**
```typescript
const toolSchema = {
  name: 'service_action_name',
  description: 'Clear description of what it does',
  inputSchema: {
    type: 'object',
    properties: {
      // parameters
    },
    required: ['requiredParam']
  }
};
```

2. **Implement handler**
```typescript
async handleToolCall(toolName: string, params: any) {
  try {
    // Validate inputs
    this.validateParams(toolName, params);

    // Execute operation
    const result = await this.executeOperation(params);

    // Log success
    this.logger.log(`${toolName} succeeded`, { params, result });

    return {
      success: true,
      data: result
    };
  } catch (error) {
    // Log error
    this.logger.error(`${toolName} failed`, { params, error });

    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: error.details
      }
    };
  }
}
```

3. **Add tests**
```typescript
describe('ServiceName', () => {
  it('should handle tool call successfully', async () => {
    const result = await service.handleToolCall('tool_name', validParams);
    expect(result.success).toBe(true);
  });

  it('should validate parameters', async () => {
    const result = await service.handleToolCall('tool_name', invalidParams);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:e2e

# Test specific service
npm test -- mcp-polygon

# Watch mode
npm test -- --watch
```

### Debugging

```bash
# Enable debug logs
LOG_LEVEL=debug npm start

# View real-time logs
tail -f /tmp/crown-*.log

# Test tool directly
curl -X POST http://localhost:3000/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{"tool": "polygon_get_balance", "params": {}}'
```

## Next Steps

- Implement the NestJS applications
- Add comprehensive tests
- Set up CI/CD
- Configure monitoring
- Add rate limiting
- Implement caching
- Add webhooks support
