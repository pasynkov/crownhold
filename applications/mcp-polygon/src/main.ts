#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Minimal MCP server for Phase 1A: Testing Claude Desktop integration
const server = new Server(
  {
    name: 'crown-polygon-mock',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'polygon_get_balance',
        description: 'Get USDC and MATIC balance from Polygon wallet (mock data for testing)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'polygon_get_token_price',
        description: 'Get current USDC price in EUR (mock data for testing)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'polygon_get_balance') {
    // Mock balance data
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              address: '0xMOCK1234567890abcdef',
              usdc: '5234.50',
              matic: '12.45',
            },
          }),
        },
      ],
    };
  }

  if (name === 'polygon_get_token_price') {
    // Mock price data
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              token: 'USDC',
              currency: 'EUR',
              price: '0.9200',
            },
          }),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Crown Hold Polygon Mock MCP server running on stdio');
  console.error('Version: 0.1.0');
  console.error('Phase: 1A - Minimal Mock for Testing');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
