# Environment Setup Guide

This guide covers setting up environment variables and secrets for Crown Hold MCP servers.

## Overview

Each MCP server requires its own `.env` file containing API credentials, wallet addresses, and configuration settings. All sensitive information is stored in these files and never committed to version control.

## Security Principles

1. **Never commit `.env` files** - they contain private keys and API secrets
2. **Use `.env.example` files** - template files for required variables
3. **Separate environments** - different credentials for dev/test/prod
4. **Minimal permissions** - use read-only API keys where possible
5. **Regular rotation** - change API keys periodically

## Environment Files Structure

```
applications/
├── mcp-polygon/
│   ├── .env                 # ❌ Not in git (your secrets)
│   └── .env.example         # ✅ In git (template)
├── mcp-kraken/
│   ├── .env                 # ❌ Not in git
│   └── .env.example         # ✅ In git
└── mcp-wise/
    ├── .env                 # ❌ Not in git
    └── .env.example         # ✅ In git
```

## Polygon MCP Server (.env)

### Required Variables

```bash
# Network Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137

# Wallet Configuration
WALLET_PRIVATE_KEY=0x1234567890abcdef...
WALLET_ADDRESS=0xYourWalletAddress...

# USDC Token Configuration
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDC_DECIMALS=6

# Predefined Recipients (Kraken deposit address)
KRAKEN_DEPOSIT_ADDRESS=0xKrakenDepositAddress...

# Transaction Configuration
MAX_TRANSFER_AMOUNT_USDC=10000
GAS_LIMIT_MULTIPLIER=1.2
MAX_GAS_PRICE_GWEI=500

# API Configuration
ETHERSCAN_API_KEY=YourEtherscanApiKey
API_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
LOG_FILE=/tmp/crown-polygon.log
```

### Getting Polygon Credentials

1. **RPC URL**
   - Public: `https://polygon-rpc.com`
   - Infura: `https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID`
   - Alchemy: `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY`

2. **Wallet Private Key**
   ```bash
   # Export from MetaMask:
   # MetaMask → Account → Account Details → Export Private Key

   # Or create new wallet:
   # Use a hardware wallet for production
   # Keep offline backup of seed phrase
   ```

3. **Kraken Deposit Address**
   ```bash
   # Get from Kraken:
   # Funding → Deposit → USDC → Polygon Network
   # Copy the deposit address
   ```

4. **Etherscan API Key** (optional, for better transaction tracking)
   - Go to https://polygonscan.com/myapikey
   - Register and create API key

### Example .env.example

```bash
# Copy this file to .env and fill in your values

POLYGON_RPC_URL=
POLYGON_CHAIN_ID=137

WALLET_PRIVATE_KEY=
WALLET_ADDRESS=

USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDC_DECIMALS=6

KRAKEN_DEPOSIT_ADDRESS=

MAX_TRANSFER_AMOUNT_USDC=10000
GAS_LIMIT_MULTIPLIER=1.2
MAX_GAS_PRICE_GWEI=500

ETHERSCAN_API_KEY=
API_TIMEOUT_MS=30000

LOG_LEVEL=info
LOG_FILE=/tmp/crown-polygon.log
```

## Kraken MCP Server (.env)

### Required Variables

```bash
# Kraken API Credentials
KRAKEN_API_KEY=YourKrakenApiKey
KRAKEN_API_SECRET=YourKrakenApiSecret

# API Configuration
KRAKEN_API_URL=https://api.kraken.com
API_TIMEOUT_MS=30000
RATE_LIMIT_PER_SECOND=1

# Trading Configuration
MAX_ORDER_SIZE_USDC=10000
MAX_ORDER_SIZE_EUR=10000
SLIPPAGE_TOLERANCE=0.01

# Withdrawal Configuration
WISE_WITHDRAWAL_NAME=MyWiseAccount
WISE_WITHDRAWAL_METHOD=wise

# Allowed Trading Pairs
ALLOWED_TRADING_PAIRS=USDCEUR,USDCUSD,EURUSD

# Logging
LOG_LEVEL=info
LOG_FILE=/tmp/crown-kraken.log
```

### Getting Kraken Credentials

1. **API Key & Secret**
   ```bash
   # Create API key:
   # 1. Log in to Kraken
   # 2. Settings → API → Generate New Key
   # 3. Set permissions:
   #    ✓ Query Funds
   #    ✓ Query Open Orders & Trades
   #    ✓ Query Closed Orders & Trades
   #    ✓ Create & Modify Orders
   #    ✓ Deposit Funds (for deposit addresses)
   #    ✓ Withdraw Funds
   # 4. Copy Key and Secret
   ```

2. **Wise Withdrawal Setup**
   ```bash
   # Set up Wise withdrawal:
   # 1. In Kraken: Funding → Withdraw → Add Withdrawal Method
   # 2. Select Bank Transfer → Wise
   # 3. Enter your Wise account details
   # 4. Note the withdrawal method name
   ```

### Example .env.example

```bash
# Copy this file to .env and fill in your values

KRAKEN_API_KEY=
KRAKEN_API_SECRET=

KRAKEN_API_URL=https://api.kraken.com
API_TIMEOUT_MS=30000
RATE_LIMIT_PER_SECOND=1

MAX_ORDER_SIZE_USDC=10000
MAX_ORDER_SIZE_EUR=10000
SLIPPAGE_TOLERANCE=0.01

WISE_WITHDRAWAL_NAME=
WISE_WITHDRAWAL_METHOD=wise

ALLOWED_TRADING_PAIRS=USDCEUR,USDCUSD,EURUSD

LOG_LEVEL=info
LOG_FILE=/tmp/crown-kraken.log
```

## Wise MCP Server (.env)

### Required Variables

```bash
# Wise API Credentials
WISE_API_TOKEN=YourWiseApiToken
WISE_PROFILE_ID=YourProfileId

# API Configuration
WISE_API_URL=https://api.wise.com
API_TIMEOUT_MS=30000

# Predefined Recipients
REVOLUT_RECIPIENT_ID=12345678
REVOLUT_RECIPIENT_NAME=MyRevolutAccount

# Transfer Configuration
MAX_TRANSFER_AMOUNT_EUR=5000
MAX_TRANSFER_AMOUNT_GBP=5000
MAX_TRANSFER_AMOUNT_USD=5000

# Allowed Currencies
ALLOWED_CURRENCIES=EUR,GBP,USD

# Logging
LOG_LEVEL=info
LOG_FILE=/tmp/crown-wise.log
```

### Getting Wise Credentials

1. **API Token**
   ```bash
   # Create API token:
   # 1. Log in to Wise
   # 2. Settings → API tokens → Create token
   # 3. Select permissions:
   #    ✓ Read balances
   #    ✓ Create transfers
   #    ✓ View recipients
   # 4. Copy the token (save it - shown only once!)
   ```

2. **Profile ID**
   ```bash
   # Get profile ID:
   # Use Wise API explorer or:

   curl -X GET https://api.wise.com/v1/profiles \
     -H "Authorization: Bearer YOUR_API_TOKEN"

   # Use the "id" field from personal profile
   ```

3. **Recipient IDs**
   ```bash
   # Get recipient IDs:
   # 1. Add recipients in Wise web interface first
   # 2. Get their IDs via API:

   curl -X GET https://api.wise.com/v1/accounts?profile=YOUR_PROFILE_ID \
     -H "Authorization: Bearer YOUR_API_TOKEN"

   # Or use the Wise API explorer
   ```

### Example .env.example

```bash
# Copy this file to .env and fill in your values

WISE_API_TOKEN=
WISE_PROFILE_ID=

WISE_API_URL=https://api.wise.com
API_TIMEOUT_MS=30000

REVOLUT_RECIPIENT_ID=
REVOLUT_RECIPIENT_NAME=MyRevolutAccount

MAX_TRANSFER_AMOUNT_EUR=5000
MAX_TRANSFER_AMOUNT_GBP=5000
MAX_TRANSFER_AMOUNT_USD=5000

ALLOWED_CURRENCIES=EUR,GBP,USD

LOG_LEVEL=info
LOG_FILE=/tmp/crown-wise.log
```

## Setup Checklist

### Initial Setup

- [ ] Clone repository
- [ ] Copy `.env.example` to `.env` in each application directory
- [ ] Fill in all required environment variables
- [ ] Verify `.env` files are in `.gitignore`
- [ ] Test each MCP server individually

### Polygon Setup

- [ ] Get RPC URL (Polygon, Infura, or Alchemy)
- [ ] Export wallet private key (or create new wallet)
- [ ] Get Kraken USDC deposit address for Polygon
- [ ] Fund wallet with MATIC for gas fees
- [ ] Test with small USDC transfer

### Kraken Setup

- [ ] Create Kraken account (if needed)
- [ ] Complete KYC verification
- [ ] Generate API key with appropriate permissions
- [ ] Set up Wise withdrawal method
- [ ] Test deposit address generation
- [ ] Test with small order

### Wise Setup

- [ ] Create Wise account (if needed)
- [ ] Complete verification
- [ ] Generate API token
- [ ] Add recipient accounts (Revolut, etc.)
- [ ] Note recipient IDs
- [ ] Test with small transfer

## Testing Environment Variables

### Test Script

Create `scripts/test-env.sh`:

```bash
#!/bin/bash

echo "Testing Crown Hold Environment Setup..."

# Test Polygon
echo "\n🔷 Testing Polygon MCP..."
if [ -f "applications/mcp-polygon/.env" ]; then
  source applications/mcp-polygon/.env
  if [ -z "$WALLET_PRIVATE_KEY" ]; then
    echo "❌ WALLET_PRIVATE_KEY not set"
  else
    echo "✅ Polygon environment configured"
  fi
else
  echo "❌ applications/mcp-polygon/.env not found"
fi

# Test Kraken
echo "\n🐙 Testing Kraken MCP..."
if [ -f "applications/mcp-kraken/.env" ]; then
  source applications/mcp-kraken/.env
  if [ -z "$KRAKEN_API_KEY" ]; then
    echo "❌ KRAKEN_API_KEY not set"
  else
    echo "✅ Kraken environment configured"
  fi
else
  echo "❌ applications/mcp-kraken/.env not found"
fi

# Test Wise
echo "\n💸 Testing Wise MCP..."
if [ -f "applications/mcp-wise/.env" ]; then
  source applications/mcp-wise/.env
  if [ -z "$WISE_API_TOKEN" ]; then
    echo "❌ WISE_API_TOKEN not set"
  else
    echo "✅ Wise environment configured"
  fi
else
  echo "❌ applications/mcp-wise/.env not found"
fi

echo "\n✨ Environment check complete"
```

Run:
```bash
chmod +x scripts/test-env.sh
./scripts/test-env.sh
```

## Development vs Production

### Development Environment

Use testnet/sandbox credentials:

```bash
# Polygon - Mumbai Testnet
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_CHAIN_ID=80001

# Kraken - Sandbox (if available)
KRAKEN_API_URL=https://api.kraken.com/sandbox

# Wise - Sandbox
WISE_API_URL=https://api.sandbox.transferwise.tech
```

### Production Environment

Use mainnet/production credentials with:
- Real API keys
- Hardware wallet for Polygon
- Strict rate limits
- Lower max amounts initially
- Comprehensive logging

## Security Best Practices

### 1. Credential Management

```bash
# ✅ DO
- Use environment variables
- Keep .env files local only
- Use different credentials per environment
- Rotate API keys regularly

# ❌ DON'T
- Commit .env files
- Share credentials in chat/email
- Use production keys in development
- Reuse credentials across projects
```

### 2. API Key Permissions

```bash
# ✅ Minimum Required Permissions
Kraken:
  - Query Funds (read-only)
  - Trade (only if needed)
  - Withdraw (only to pre-verified accounts)

Wise:
  - Read balances
  - Create transfers to existing recipients only
  - View recipients

# ❌ Avoid
  - "Full Access" keys
  - Withdrawal to arbitrary accounts
  - API keys without IP restrictions
```

### 3. Transaction Limits

```bash
# Set conservative limits initially
MAX_TRANSFER_AMOUNT_USDC=100  # Start small
MAX_ORDER_SIZE_EUR=100

# Increase gradually as you gain confidence
# Never set unlimited
```

### 4. Monitoring

```bash
# Enable detailed logging
LOG_LEVEL=debug  # development
LOG_LEVEL=info   # production

# Review logs regularly
tail -f /tmp/crown-*.log

# Set up alerts for unusual activity
```

## Troubleshooting

### Problem: Environment Variables Not Loading

```bash
# Check .env file exists
ls -la applications/mcp-polygon/.env

# Check for syntax errors (no spaces around =)
# ✅ Correct
API_KEY=abc123

# ❌ Wrong
API_KEY = abc123
```

### Problem: API Authentication Fails

```bash
# Test credentials directly
curl -H "Authorization: Bearer $WISE_API_TOKEN" \
  https://api.wise.com/v1/profiles

# Check for:
- Expired API keys
- Wrong environment (sandbox vs production)
- IP restrictions
- Missing permissions
```

### Problem: Wallet Has No Funds

```bash
# For Polygon, you need:
- USDC for transfers
- MATIC for gas fees

# Check balances:
# Polygon: https://polygonscan.com/address/YOUR_ADDRESS
```

## Backup & Recovery

### Backup Checklist

- [ ] Save wallet seed phrase (offline, secure location)
- [ ] Document all API keys (password manager)
- [ ] Save recipient IDs and addresses
- [ ] Export account configurations
- [ ] Keep .env.example files updated

### Recovery Process

If you lose access:

1. **Wallet Recovery**
   - Use seed phrase to restore wallet
   - Update WALLET_PRIVATE_KEY in .env

2. **API Keys Recovery**
   - Revoke old keys
   - Generate new API keys
   - Update .env files
   - Restart MCP servers

3. **Recipient IDs Recovery**
   - List recipients via API
   - Update recipient IDs in .env

## Next Steps

- Read [Claude Setup](claude-setup.md) to configure Claude Desktop
- Review [MCP Servers](mcp-servers.md) for implementation details
- Check [Workflows](workflows.md) for usage examples
