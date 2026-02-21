#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as crypto from 'crypto';

// Phase 1B: Full Mock Kraken Service
const server = new Server(
  {
    name: 'crown-kraken-mock',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ========================================
// STATE MANAGEMENT
// ========================================

interface MockBalances {
  EUR: string;
  USDC: string;
  BTC: string;
}

interface MockDeposit {
  id: string;
  currency: string;
  amount: string;
  txid: string;
  status: 'pending' | 'credited';
  timestamp: Date;
}

interface MockOrder {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  price?: string;
  volume: string;
  status: 'pending' | 'open' | 'closed' | 'canceled';
  timestamp: Date;
  executed?: {
    price: string;
    volume: string;
    cost: string;
    fee: string;
  };
}

interface MockWithdrawal {
  id: string;
  currency: string;
  amount: string;
  destination: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  timestamp: Date;
}

interface MockState {
  balances: MockBalances;
  deposits: Map<string, MockDeposit>;
  orders: Map<string, MockOrder>;
  withdrawals: Map<string, MockWithdrawal>;
  depositAddress: {
    USDC: string;
  };
}

const state: MockState = {
  balances: {
    EUR: '2150.30',
    USDC: '208.73',
    BTC: '0.0023',
  },
  deposits: new Map(),
  orders: new Map(),
  withdrawals: new Map(),
  depositAddress: {
    USDC: '0xKRAKEN_DEPOSIT_ADDRESS_abc123',
  },
};

// Timing constants (in milliseconds)
const DEPOSIT_CREDIT_TIME = 180000; // 3 minutes
const ORDER_EXECUTION_TIME = 8000; // 8 seconds
const WITHDRAWAL_PROCESSING_TIME = 30000; // 30 seconds
const WITHDRAWAL_COMPLETE_TIME = 120000; // 2 minutes

// ========================================
// HELPER FUNCTIONS
// ========================================

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.error(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.error(`[${timestamp}] ${message}`);
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate slight price fluctuation
function getPrice(pair: string): string {
  const basePrices: Record<string, number> = {
    'USDCEUR': 0.9200,
    'USDCUSD': 1.0000,
    'BTCEUR': 45000.00,
    'BTCUSD': 49000.00,
  };

  const basePrice = basePrices[pair] || 1.0;
  const fluctuation = (Math.random() - 0.5) * (basePrice * 0.002); // ±0.1%
  return (basePrice + fluctuation).toFixed(4);
}

async function simulateDepositCredit(depositId: string) {
  await sleep(DEPOSIT_CREDIT_TIME);

  const deposit = state.deposits.get(depositId);
  if (!deposit) return;

  deposit.status = 'credited';

  // Update balance
  const currency = deposit.currency as keyof MockBalances;
  const currentBalance = parseFloat(state.balances[currency]);
  const depositAmount = parseFloat(deposit.amount);
  state.balances[currency] = (currentBalance + depositAmount).toFixed(2);

  log(`Deposit ${depositId} credited`, {
    amount: deposit.amount,
    currency: deposit.currency,
    newBalance: state.balances[currency],
  });
}

async function simulateOrderExecution(orderId: string) {
  await sleep(ORDER_EXECUTION_TIME);

  const order = state.orders.get(orderId);
  if (!order) return;

  order.status = 'closed';

  // Calculate execution
  const price = getPrice(order.pair);
  const volume = order.volume;
  const cost = (parseFloat(price) * parseFloat(volume)).toFixed(2);
  const fee = (parseFloat(cost) * 0.0026).toFixed(2); // 0.26% fee

  order.executed = {
    price,
    volume,
    cost,
    fee,
  };

  // Update balances based on order type
  if (order.type === 'sell') {
    // Selling USDC for EUR
    if (order.pair === 'USDCEUR') {
      const currentUSDC = parseFloat(state.balances.USDC);
      const currentEUR = parseFloat(state.balances.EUR);

      state.balances.USDC = (currentUSDC - parseFloat(volume)).toFixed(2);
      state.balances.EUR = (currentEUR + parseFloat(cost) - parseFloat(fee)).toFixed(2);
    }
  } else if (order.type === 'buy') {
    // Buying USDC with EUR
    if (order.pair === 'USDCEUR') {
      const currentUSDC = parseFloat(state.balances.USDC);
      const currentEUR = parseFloat(state.balances.EUR);

      state.balances.USDC = (currentUSDC + parseFloat(volume)).toFixed(2);
      state.balances.EUR = (currentEUR - parseFloat(cost) - parseFloat(fee)).toFixed(2);
    }
  }

  log(`Order ${orderId} executed`, order.executed);
}

async function simulateWithdrawal(withdrawalId: string) {
  const withdrawal = state.withdrawals.get(withdrawalId);
  if (!withdrawal) return;

  // Phase 1: Processing
  await sleep(WITHDRAWAL_PROCESSING_TIME);
  withdrawal.status = 'processing';
  log(`Withdrawal ${withdrawalId} processing`);

  // Phase 2: Success
  await sleep(WITHDRAWAL_COMPLETE_TIME - WITHDRAWAL_PROCESSING_TIME);
  withdrawal.status = 'success';
  log(`Withdrawal ${withdrawalId} completed`);
}

// ========================================
// TOOL HANDLERS
// ========================================

async function handleGetBalances() {
  log('Getting balances');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            balances: state.balances,
          },
        }),
      },
    ],
  };
}

async function handleGetTicker(args: any) {
  const pair = args?.pair || 'USDCEUR';

  log('Getting ticker', { pair });

  const price = getPrice(pair);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            pair,
            price,
            timestamp: new Date().toISOString(),
          },
        }),
      },
    ],
  };
}

async function handleDepositAddress(args: any) {
  const currency = args?.currency || 'USDC';

  log('Getting deposit address', { currency });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            currency,
            address: state.depositAddress.USDC,
            network: 'Polygon',
          },
        }),
      },
    ],
  };
}

async function handleCheckDeposit(args: any) {
  const { txid } = args;

  log('Checking deposit', { txid });

  // Look for existing deposit
  let deposit = Array.from(state.deposits.values()).find(d => d.txid === txid);

  if (!deposit) {
    // Create new deposit (simulating detection)
    const depositId = generateId('DEP');
    deposit = {
      id: depositId,
      currency: 'USDC',
      amount: '100.00', // Mock amount from transaction
      txid,
      status: 'pending',
      timestamp: new Date(),
    };

    state.deposits.set(depositId, deposit);
    log(`New deposit detected: ${depositId}`, { txid, amount: deposit.amount });

    // Start credit simulation
    simulateDepositCredit(depositId);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            depositId: deposit.id,
            currency: deposit.currency,
            amount: deposit.amount,
            txid: deposit.txid,
            status: deposit.status,
            credited: deposit.status === 'credited',
          },
        }),
      },
    ],
  };
}

async function handleCreateOrder(args: any) {
  const { pair, type, volume, ordertype = 'market', price } = args;

  log('Creating order', { pair, type, volume, ordertype });

  // Validate
  if (type === 'sell') {
    const [base] = pair.split(/EUR|USD/);
    const currentBalance = parseFloat(state.balances[base as keyof MockBalances] || '0');
    const orderVolume = parseFloat(volume);

    if (orderVolume > currentBalance) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'INSUFFICIENT_BALANCE',
                message: `Insufficient ${base} balance. You have ${currentBalance}, need ${volume}`,
              },
            }),
          },
        ],
      };
    }
  }

  // Create order
  const orderId = generateId('ORD');
  const order: MockOrder = {
    id: orderId,
    pair,
    type,
    ordertype,
    price,
    volume,
    status: 'pending',
    timestamp: new Date(),
  };

  state.orders.set(orderId, order);
  log(`Order created: ${orderId}`);

  // Start execution simulation
  simulateOrderExecution(orderId);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            orderId: order.id,
            pair: order.pair,
            type: order.type,
            volume: order.volume,
            status: order.status,
          },
        }),
      },
    ],
  };
}

async function handleGetOrderStatus(args: any) {
  const { orderId } = args;

  log('Getting order status', { orderId });

  const order = state.orders.get(orderId);

  if (!order) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found',
            },
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            orderId: order.id,
            pair: order.pair,
            type: order.type,
            volume: order.volume,
            status: order.status,
            executed: order.executed,
            timestamp: order.timestamp.toISOString(),
          },
        }),
      },
    ],
  };
}

async function handleWithdrawFiat(args: any) {
  const { currency, amount, destination } = args;

  log('Withdrawing fiat', { currency, amount, destination });

  // Validate balance
  const currentBalance = parseFloat(state.balances[currency as keyof MockBalances] || '0');
  const withdrawAmount = parseFloat(amount);

  if (withdrawAmount > currentBalance) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: `Insufficient ${currency} balance. You have ${currentBalance}, need ${amount}`,
            },
          }),
        },
      ],
    };
  }

  // Create withdrawal
  const withdrawalId = generateId('WD');
  const withdrawal: MockWithdrawal = {
    id: withdrawalId,
    currency,
    amount,
    destination,
    status: 'pending',
    timestamp: new Date(),
  };

  state.withdrawals.set(withdrawalId, withdrawal);

  // Update balance immediately (pessimistic)
  state.balances[currency as keyof MockBalances] = (currentBalance - withdrawAmount).toFixed(2);

  log(`Withdrawal created: ${withdrawalId}`);

  // Start withdrawal simulation
  simulateWithdrawal(withdrawalId);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            withdrawalId: withdrawal.id,
            currency: withdrawal.currency,
            amount: withdrawal.amount,
            destination: withdrawal.destination,
            status: withdrawal.status,
          },
        }),
      },
    ],
  };
}

async function handleGetWithdrawalStatus(args: any) {
  const { withdrawalId } = args;

  log('Getting withdrawal status', { withdrawalId });

  const withdrawal = state.withdrawals.get(withdrawalId);

  if (!withdrawal) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'WITHDRAWAL_NOT_FOUND',
              message: 'Withdrawal not found',
            },
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            withdrawalId: withdrawal.id,
            currency: withdrawal.currency,
            amount: withdrawal.amount,
            destination: withdrawal.destination,
            status: withdrawal.status,
            timestamp: withdrawal.timestamp.toISOString(),
          },
        }),
      },
    ],
  };
}

// ========================================
// TOOL REGISTRATION
// ========================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'kraken_get_balances',
        description: 'Get all cryptocurrency and fiat balances on Kraken',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kraken_get_ticker',
        description: 'Get current price for a trading pair (e.g., USDCEUR)',
        inputSchema: {
          type: 'object',
          properties: {
            pair: {
              type: 'string',
              description: 'Trading pair (default: USDCEUR)',
            },
          },
        },
      },
      {
        name: 'kraken_deposit_address',
        description: 'Get deposit address for a cryptocurrency (e.g., USDC on Polygon)',
        inputSchema: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              description: 'Currency code (default: USDC)',
            },
          },
        },
      },
      {
        name: 'kraken_check_deposit',
        description: 'Check if a deposit has been credited (by blockchain transaction hash). Takes ~3 minutes to credit after blockchain confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            txid: {
              type: 'string',
              description: 'Blockchain transaction hash',
            },
          },
          required: ['txid'],
        },
      },
      {
        name: 'kraken_create_order',
        description: 'Create a buy or sell order. Market orders execute in ~8 seconds.',
        inputSchema: {
          type: 'object',
          properties: {
            pair: {
              type: 'string',
              description: 'Trading pair (e.g., USDCEUR)',
            },
            type: {
              type: 'string',
              description: 'Order type: buy or sell',
              enum: ['buy', 'sell'],
            },
            volume: {
              type: 'string',
              description: 'Order volume in base currency',
            },
            ordertype: {
              type: 'string',
              description: 'Order type: market or limit (default: market)',
            },
            price: {
              type: 'string',
              description: 'Limit price (only for limit orders)',
            },
          },
          required: ['pair', 'type', 'volume'],
        },
      },
      {
        name: 'kraken_get_order_status',
        description: 'Check the status of an order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'kraken_withdraw_fiat',
        description: 'Withdraw fiat currency to external account (e.g., bank, Wise). Takes ~2 minutes to process.',
        inputSchema: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              description: 'Currency code (EUR, USD, etc.)',
            },
            amount: {
              type: 'string',
              description: 'Amount to withdraw',
            },
            destination: {
              type: 'string',
              description: 'Destination account (e.g., wise, bank)',
            },
          },
          required: ['currency', 'amount', 'destination'],
        },
      },
      {
        name: 'kraken_get_withdrawal_status',
        description: 'Check the status of a withdrawal',
        inputSchema: {
          type: 'object',
          properties: {
            withdrawalId: {
              type: 'string',
              description: 'Withdrawal ID',
            },
          },
          required: ['withdrawalId'],
        },
      },
    ],
  };
});

// ========================================
// TOOL CALL HANDLER
// ========================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    log(`Tool called: ${name}`, args);

    switch (name) {
      case 'kraken_get_balances':
        return await handleGetBalances();

      case 'kraken_get_ticker':
        return await handleGetTicker(args);

      case 'kraken_deposit_address':
        return await handleDepositAddress(args);

      case 'kraken_check_deposit':
        return await handleCheckDeposit(args);

      case 'kraken_create_order':
        return await handleCreateOrder(args);

      case 'kraken_get_order_status':
        return await handleGetOrderStatus(args);

      case 'kraken_withdraw_fiat':
        return await handleWithdrawFiat(args);

      case 'kraken_get_withdrawal_status':
        return await handleGetWithdrawalStatus(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    log(`Error in tool ${name}:`, error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: error.message,
            },
          }),
        },
      ],
    };
  }
});

// ========================================
// SERVER STARTUP
// ========================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('='.repeat(60));
  log('Crown Hold Kraken Mock MCP Server');
  log('='.repeat(60));
  log('Version: 0.2.0');
  log('Phase: 1B - Full Mock Service');
  log('Transport: stdio');
  log('Initial balances:', state.balances);
  log('Deposit address (USDC):', state.depositAddress.USDC);
  log('='.repeat(60));
  log('Server ready. Waiting for tool calls...');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
