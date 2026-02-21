#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as crypto from 'crypto';

// Phase 1B: Full Mock Service with realistic async behavior
const server = new Server(
  {
    name: 'crown-polygon-mock',
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

interface MockTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  timestamp: Date;
  gasUsed?: string;
}

interface MockState {
  balance: {
    usdc: string;
    matic: string;
  };
  transactions: Map<string, MockTransaction>;
  transactionHistory: MockTransaction[];
}

const state: MockState = {
  balance: {
    usdc: '5234.50',
    matic: '12.45',
  },
  transactions: new Map(),
  transactionHistory: [],
};

const WALLET_ADDRESS = '0xMOCK1234567890abcdef';
const CONFIRMATION_TIME_MS = 2000; // 2 sec per block
const REQUIRED_CONFIRMATIONS = 12;

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

function generateTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateConfirmations(txHash: string) {
  const tx = state.transactions.get(txHash);
  if (!tx) return;

  // Simulate block confirmations over time
  for (let i = 1; i <= REQUIRED_CONFIRMATIONS; i++) {
    await sleep(CONFIRMATION_TIME_MS);
    tx.confirmations = i;

    if (i === 1) {
      tx.status = 'confirming';
      tx.blockNumber = Math.floor(Math.random() * 1000000) + 40000000;
      log(`Transaction ${txHash.slice(0, 10)}... included in block ${tx.blockNumber}`);
    }

    if (i >= REQUIRED_CONFIRMATIONS) {
      tx.status = 'confirmed';
      log(`Transaction ${txHash.slice(0, 10)}... confirmed (${i}/${REQUIRED_CONFIRMATIONS})`);
    } else {
      log(`Transaction ${txHash.slice(0, 10)}... confirming (${i}/${REQUIRED_CONFIRMATIONS})`);
    }
  }
}

// ========================================
// TOOL HANDLERS
// ========================================

async function handleGetBalance() {
  log('Getting balance');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            address: WALLET_ADDRESS,
            usdc: state.balance.usdc,
            matic: state.balance.matic,
          },
        }),
      },
    ],
  };
}

async function handleGetTokenPrice() {
  log('Getting token price');

  // Simulate slight price fluctuation
  const basePrice = 0.92;
  const fluctuation = (Math.random() - 0.5) * 0.002; // ±0.001
  const price = (basePrice + fluctuation).toFixed(4);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            token: 'USDC',
            currency: 'EUR',
            price,
          },
        }),
      },
    ],
  };
}

async function handleTransferUSDC(args: any) {
  const { recipient, amount } = args;

  log('Transfer USDC', { recipient, amount });

  // Validate amount
  const transferAmount = parseFloat(amount);
  const currentBalance = parseFloat(state.balance.usdc);

  if (isNaN(transferAmount) || transferAmount <= 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_AMOUNT',
              message: 'Amount must be a positive number',
            },
          }),
        },
      ],
    };
  }

  if (transferAmount > currentBalance) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: `Insufficient balance. You have ${state.balance.usdc} USDC, need ${amount} USDC`,
            },
          }),
        },
      ],
    };
  }

  // Generate mock transaction
  const txHash = generateTxHash();
  const gasUsed = '0.01'; // Mock gas cost

  const tx: MockTransaction = {
    hash: txHash,
    from: WALLET_ADDRESS,
    to: recipient,
    amount: amount.toString(),
    status: 'pending',
    confirmations: 0,
    timestamp: new Date(),
    gasUsed,
  };

  state.transactions.set(txHash, tx);
  state.transactionHistory.push(tx);

  // Update balance immediately (optimistic update)
  state.balance.usdc = (currentBalance - transferAmount).toFixed(2);
  state.balance.matic = (parseFloat(state.balance.matic) - parseFloat(gasUsed)).toFixed(2);

  log(`Transaction created: ${txHash}`, { from: WALLET_ADDRESS, to: recipient, amount });

  // Start async confirmation simulation
  simulateConfirmations(txHash);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            transactionHash: txHash,
            from: WALLET_ADDRESS,
            to: recipient,
            amount: amount.toString(),
            status: 'pending',
            gasUsed,
          },
        }),
      },
    ],
  };
}

async function handleGetTransactionStatus(args: any) {
  const { transactionHash } = args;

  log('Get transaction status', { transactionHash });

  const tx = state.transactions.get(transactionHash);

  if (!tx) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'TX_NOT_FOUND',
              message: 'Transaction not found',
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
            transactionHash: tx.hash,
            status: tx.status,
            confirmations: tx.confirmations,
            requiredConfirmations: REQUIRED_CONFIRMATIONS,
            blockNumber: tx.blockNumber,
            from: tx.from,
            to: tx.to,
            amount: tx.amount,
            gasUsed: tx.gasUsed,
            timestamp: tx.timestamp.toISOString(),
          },
        }),
      },
    ],
  };
}

async function handleGetTransactions(args: any) {
  const limit = args?.limit || 10;

  log('Get transactions', { limit });

  // Return most recent transactions
  const recentTxs = state.transactionHistory
    .slice(-limit)
    .reverse()
    .map(tx => ({
      transactionHash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      status: tx.status,
      confirmations: tx.confirmations,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp.toISOString(),
    }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            transactions: recentTxs,
            total: state.transactionHistory.length,
          },
        }),
      },
    ],
  };
}

async function handleEstimateGas() {
  log('Estimate gas');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            gasLimit: '50000',
            gasPrice: '0.00000002', // MATIC
            estimatedCost: '0.01', // MATIC
            estimatedCostUSD: '0.008',
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
        name: 'polygon_get_balance',
        description: 'Get USDC and MATIC balance from Polygon wallet',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'polygon_get_token_price',
        description: 'Get current USDC price in EUR',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'polygon_transfer_usdc',
        description: 'Transfer USDC to a recipient address on Polygon. Returns transaction hash. Transaction will be confirmed after ~24 seconds (12 blocks).',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'Recipient Ethereum address (0x...)',
            },
            amount: {
              type: 'string',
              description: 'Amount of USDC to transfer',
            },
          },
          required: ['recipient', 'amount'],
        },
      },
      {
        name: 'polygon_get_transaction_status',
        description: 'Check the status and confirmations of a Polygon transaction',
        inputSchema: {
          type: 'object',
          properties: {
            transactionHash: {
              type: 'string',
              description: 'Transaction hash (0x...)',
            },
          },
          required: ['transactionHash'],
        },
      },
      {
        name: 'polygon_get_transactions',
        description: 'Get recent transaction history',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of transactions to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'polygon_estimate_gas',
        description: 'Estimate gas cost for a USDC transfer',
        inputSchema: {
          type: 'object',
          properties: {},
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
      case 'polygon_get_balance':
        return await handleGetBalance();

      case 'polygon_get_token_price':
        return await handleGetTokenPrice();

      case 'polygon_transfer_usdc':
        return await handleTransferUSDC(args);

      case 'polygon_get_transaction_status':
        return await handleGetTransactionStatus(args);

      case 'polygon_get_transactions':
        return await handleGetTransactions(args);

      case 'polygon_estimate_gas':
        return await handleEstimateGas();

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
  log('Crown Hold Polygon Mock MCP Server');
  log('='.repeat(60));
  log('Version: 0.2.0');
  log('Phase: 1B - Full Mock Service');
  log('Transport: stdio');
  log('Initial balances:', state.balance);
  log('Wallet address: ' + WALLET_ADDRESS);
  log('='.repeat(60));
  log('Server ready. Waiting for tool calls...');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
