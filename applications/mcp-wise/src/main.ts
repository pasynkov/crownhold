#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as crypto from 'crypto';

// Phase 1B: Full Mock Wise Service
const server = new Server(
  {
    name: 'crown-wise-mock',
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
  GBP: string;
  USD: string;
}

interface MockRecipient {
  id: string;
  name: string;
  currency: string;
  type: 'revolut' | 'bank';
}

interface MockTransfer {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  recipientId: string;
  recipientName: string;
  status: 'processing' | 'funds_converted' | 'outgoing_payment_sent' | 'completed' | 'failed';
  rate: string;
  fee: string;
  timestamp: Date;
  statusHistory: Array<{ status: string; timestamp: Date }>;
}

interface MockState {
  balances: MockBalances;
  recipients: MockRecipient[];
  transfers: Map<string, MockTransfer>;
}

const state: MockState = {
  balances: {
    EUR: '1500.00',
    GBP: '800.00',
    USD: '250.00',
  },
  recipients: [
    {
      id: 'RECIPIENT-REVOLUT-EUR',
      name: 'Revolut Account (EUR)',
      currency: 'EUR',
      type: 'revolut',
    },
    {
      id: 'RECIPIENT-REVOLUT-GBP',
      name: 'Revolut Account (GBP)',
      currency: 'GBP',
      type: 'revolut',
    },
    {
      id: 'RECIPIENT-BANK-EUR',
      name: 'Bank Account (EUR)',
      currency: 'EUR',
      type: 'bank',
    },
  ],
  transfers: new Map(),
};

// Timing constants (in milliseconds)
const STATUS_INTERVAL = 30000; // 30 seconds between status updates

// Exchange rates
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  EUR: {
    USD: 1.09,
    GBP: 0.86,
    EUR: 1.00,
  },
  GBP: {
    USD: 1.27,
    EUR: 1.16,
    GBP: 1.00,
  },
  USD: {
    EUR: 0.92,
    GBP: 0.79,
    USD: 1.00,
  },
};

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

function getExchangeRate(from: string, to: string): string {
  if (from === to) return '1.0000';

  const rate = EXCHANGE_RATES[from]?.[to] || 1.0;
  const fluctuation = (Math.random() - 0.5) * (rate * 0.001); // ±0.05%
  return (rate + fluctuation).toFixed(4);
}

function calculateFee(amount: number): string {
  // Wise fee: ~0.5-1% depending on amount
  const feePercentage = 0.007; // 0.7%
  const minFee = 0.50;
  const fee = Math.max(amount * feePercentage, minFee);
  return fee.toFixed(2);
}

async function simulateTransferStatusTimeline(transferId: string) {
  const transfer = state.transfers.get(transferId);
  if (!transfer) return;

  const statuses: Array<MockTransfer['status']> = [
    'processing',
    'funds_converted',
    'outgoing_payment_sent',
    'completed',
  ];

  // Skip funds_converted if same currency
  const statusSequence =
    transfer.sourceCurrency === transfer.targetCurrency
      ? statuses.filter(s => s !== 'funds_converted')
      : statuses;

  for (let i = 1; i < statusSequence.length; i++) {
    await sleep(STATUS_INTERVAL);

    const newStatus = statusSequence[i];
    transfer.status = newStatus;
    transfer.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
    });

    log(`Transfer ${transferId} status updated: ${newStatus}`);
  }
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

async function handleGetRate(args: any) {
  const { sourceCurrency, targetCurrency } = args;

  log('Getting exchange rate', { sourceCurrency, targetCurrency });

  const rate = getExchangeRate(sourceCurrency, targetCurrency);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            sourceCurrency,
            targetCurrency,
            rate,
            timestamp: new Date().toISOString(),
          },
        }),
      },
    ],
  };
}

async function handleGetRecipients() {
  log('Getting recipients');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            recipients: state.recipients,
          },
        }),
      },
    ],
  };
}

async function handleCreateTransfer(args: any) {
  const { recipientId, sourceAmount, sourceCurrency, reference } = args;

  log('Creating transfer', { recipientId, sourceAmount, sourceCurrency });

  // Find recipient
  const recipient = state.recipients.find(r => r.id === recipientId);

  if (!recipient) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'RECIPIENT_NOT_FOUND',
              message: 'Recipient not found',
            },
          }),
        },
      ],
    };
  }

  // Validate balance
  const currentBalance = parseFloat(state.balances[sourceCurrency as keyof MockBalances] || '0');
  const transferAmount = parseFloat(sourceAmount);

  if (transferAmount > currentBalance) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: `Insufficient ${sourceCurrency} balance. You have ${currentBalance}, need ${sourceAmount}`,
            },
          }),
        },
      ],
    };
  }

  // Calculate target amount
  const rate = getExchangeRate(sourceCurrency, recipient.currency);
  const fee = calculateFee(transferAmount);
  const targetAmount = ((transferAmount - parseFloat(fee)) * parseFloat(rate)).toFixed(2);

  // Create transfer
  const transferId = generateId('TRF');
  const transfer: MockTransfer = {
    id: transferId,
    sourceCurrency,
    targetCurrency: recipient.currency,
    sourceAmount,
    targetAmount,
    recipientId,
    recipientName: recipient.name,
    status: 'processing',
    rate,
    fee,
    timestamp: new Date(),
    statusHistory: [
      {
        status: 'processing',
        timestamp: new Date(),
      },
    ],
  };

  state.transfers.set(transferId, transfer);

  // Update balance immediately (pessimistic)
  state.balances[sourceCurrency as keyof MockBalances] = (currentBalance - transferAmount).toFixed(
    2
  );

  log(`Transfer created: ${transferId}`, {
    from: sourceCurrency,
    to: recipient.currency,
    sourceAmount,
    targetAmount,
    fee,
  });

  // Start status timeline simulation
  simulateTransferStatusTimeline(transferId);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            transferId: transfer.id,
            sourceCurrency: transfer.sourceCurrency,
            targetCurrency: transfer.targetCurrency,
            sourceAmount: transfer.sourceAmount,
            targetAmount: transfer.targetAmount,
            recipient: transfer.recipientName,
            rate: transfer.rate,
            fee: transfer.fee,
            status: transfer.status,
            reference: reference || 'Crown Hold transfer',
          },
        }),
      },
    ],
  };
}

async function handleGetTransferStatus(args: any) {
  const { transferId } = args;

  log('Getting transfer status', { transferId });

  const transfer = state.transfers.get(transferId);

  if (!transfer) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'TRANSFER_NOT_FOUND',
              message: 'Transfer not found',
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
            transferId: transfer.id,
            sourceCurrency: transfer.sourceCurrency,
            targetCurrency: transfer.targetCurrency,
            sourceAmount: transfer.sourceAmount,
            targetAmount: transfer.targetAmount,
            recipient: transfer.recipientName,
            rate: transfer.rate,
            fee: transfer.fee,
            status: transfer.status,
            timestamp: transfer.timestamp.toISOString(),
            statusHistory: transfer.statusHistory.map(h => ({
              status: h.status,
              timestamp: h.timestamp.toISOString(),
            })),
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
        name: 'wise_get_balances',
        description: 'Get all multi-currency balances in Wise account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wise_get_rate',
        description: 'Get current exchange rate between two currencies',
        inputSchema: {
          type: 'object',
          properties: {
            sourceCurrency: {
              type: 'string',
              description: 'Source currency (EUR, GBP, USD, etc.)',
            },
            targetCurrency: {
              type: 'string',
              description: 'Target currency (EUR, GBP, USD, etc.)',
            },
          },
          required: ['sourceCurrency', 'targetCurrency'],
        },
      },
      {
        name: 'wise_get_recipients',
        description: 'Get list of saved recipients (Revolut, bank accounts, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wise_create_transfer',
        description:
          'Create a transfer to a recipient. Transfer goes through status timeline: processing → funds_converted (if currency exchange) → outgoing_payment_sent → completed. Takes ~2 minutes in mock.',
        inputSchema: {
          type: 'object',
          properties: {
            recipientId: {
              type: 'string',
              description: 'Recipient ID (use wise_get_recipients to find)',
            },
            sourceAmount: {
              type: 'string',
              description: 'Amount to send in source currency',
            },
            sourceCurrency: {
              type: 'string',
              description: 'Source currency (EUR, GBP, USD, etc.)',
            },
            reference: {
              type: 'string',
              description: 'Optional transfer reference',
            },
          },
          required: ['recipientId', 'sourceAmount', 'sourceCurrency'],
        },
      },
      {
        name: 'wise_get_transfer_status',
        description: 'Check the status of a transfer with full status timeline',
        inputSchema: {
          type: 'object',
          properties: {
            transferId: {
              type: 'string',
              description: 'Transfer ID',
            },
          },
          required: ['transferId'],
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
      case 'wise_get_balances':
        return await handleGetBalances();

      case 'wise_get_rate':
        return await handleGetRate(args);

      case 'wise_get_recipients':
        return await handleGetRecipients();

      case 'wise_create_transfer':
        return await handleCreateTransfer(args);

      case 'wise_get_transfer_status':
        return await handleGetTransferStatus(args);

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
  log('Crown Hold Wise Mock MCP Server');
  log('='.repeat(60));
  log('Version: 0.2.0');
  log('Phase: 1B - Full Mock Service');
  log('Transport: stdio');
  log('Initial balances:', state.balances);
  log(`Recipients: ${state.recipients.length} configured`);
  log('='.repeat(60));
  log('Server ready. Waiting for tool calls...');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
