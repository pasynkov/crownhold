#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PolygonRealService } from './services/polygon-real.service.js';
import { PolygonSimulationService } from './services/polygon-simulation.service.js';
import type { IPolygonService, OperationMode } from './services/types.js';

// Phase 1C: Read-Only + Transaction Simulation
const server = new Server(
  {
    name: 'crown-polygon',
    version: '0.3.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ========================================
// CONFIGURATION
// ========================================

const OPERATION_MODE: OperationMode = (process.env.OPERATION_MODE as OperationMode) || 'simulation';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0xMOCK1234567890abcdef';
const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23';

// ========================================
// SERVICE INITIALIZATION
// ========================================

let polygonService: Partial<IPolygonService>;
let mode: string;

if (OPERATION_MODE === 'mock') {
  // For Phase 1C, we'll focus on simulation mode
  // Mock mode can fallback to old behavior if needed
  mode = 'MOCK (Phase 1B)';
  // Import mock logic would go here - for now use simulation as fallback
  console.error('[WARN] Mock mode not fully ported to Phase 1C, using simulation');
}

if (OPERATION_MODE === 'simulation' || OPERATION_MODE === 'mock') {
  mode = 'SIMULATION (Phase 1C) - Real Data + Simulated Writes';

  try {
    // Initialize real service for reading
    const realService = new PolygonRealService({
      rpcUrl: POLYGON_RPC_URL,
      walletAddress: WALLET_ADDRESS,
      usdcAddress: USDC_CONTRACT_ADDRESS,
    });

    // Initialize simulation service for writes
    const simulationService = new PolygonSimulationService(realService);

    // Combine: reads from real, writes from simulation
    polygonService = {
      getBalance: () => realService.getBalance(),
      getTokenPrice: () => realService.getTokenPrice(),
      estimateGas: () => realService.estimateGas(),
      transferUSDC: (recipient: string, amount: string) =>
        simulationService.transferUSDC(recipient, amount),
      getTransactionStatus: (hash: string) => realService.getTransactionStatus(hash),
      getTransactions: (limit?: number) => realService.getTransactions(limit),
    };
  } catch (error: any) {
    console.error('[ERROR] Failed to initialize Polygon services:', error.message);
    process.exit(1);
  }
} else if (OPERATION_MODE === 'production') {
  mode = 'PRODUCTION (Phase 3+) - Real Operations';
  // Production mode would go here (Phase 3)
  console.error('[ERROR] Production mode not implemented yet (Phase 3)');
  process.exit(1);
} else {
  console.error(`[ERROR] Unknown operation mode: ${OPERATION_MODE}`);
  process.exit(1);
}

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

// ========================================
// TOOL HANDLERS
// ========================================

async function handleGetBalance() {
  log('Tool: polygon_get_balance');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.getBalance!()),
      },
    ],
  };
}

async function handleGetTokenPrice() {
  log('Tool: polygon_get_token_price');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.getTokenPrice!()),
      },
    ],
  };
}

async function handleTransferUSDC(args: any) {
  const { recipient, amount } = args;
  log('Tool: polygon_transfer_usdc', { recipient, amount });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.transferUSDC!(recipient, amount)),
      },
    ],
  };
}

async function handleGetTransactionStatus(args: any) {
  const { transactionHash } = args;
  log('Tool: polygon_get_transaction_status', { transactionHash });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.getTransactionStatus!(transactionHash)),
      },
    ],
  };
}

async function handleGetTransactions(args: any) {
  const limit = args?.limit || 10;
  log('Tool: polygon_get_transactions', { limit });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.getTransactions!(limit)),
      },
    ],
  };
}

async function handleEstimateGas() {
  log('Tool: polygon_estimate_gas');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await polygonService.estimateGas!()),
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
        description: `Get USDC and MATIC balance from Polygon wallet ${OPERATION_MODE === 'simulation' ? '(real blockchain data)' : ''}`,
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
        description:
          OPERATION_MODE === 'simulation'
            ? 'SIMULATE USDC transfer (validates with real data, does not send real transaction) 🛡️'
            : 'Transfer USDC to a recipient address on Polygon',
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
        description: `Estimate gas cost for a USDC transfer ${OPERATION_MODE === 'simulation' ? '(real gas prices)' : ''}`,
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
  log('Crown Hold Polygon MCP Server');
  log('='.repeat(60));
  log('Version: 0.3.0');
  log(`Mode: ${mode}`);
  log('Transport: stdio');
  log('Configuration:', {
    operationMode: OPERATION_MODE,
    rpcUrl: POLYGON_RPC_URL,
    walletAddress: WALLET_ADDRESS,
    usdcContract: USDC_CONTRACT_ADDRESS,
  });

  if (OPERATION_MODE === 'simulation') {
    log('='.repeat(60));
    log('🛡️  SIMULATION MODE ACTIVE');
    log('='.repeat(60));
    log('✓ Read operations use REAL blockchain data');
    log('✓ Write operations are SIMULATED (no real transactions)');
    log('✓ All simulations validated against real balances');
    log('✓ Zero risk testing environment');
    log('='.repeat(60));
  }

  log('Server ready. Waiting for tool calls...');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
