# Common Workflows

This guide provides examples of common financial operations using Crown Hold through Claude Desktop.

## Basic Operations

### 1. Check Balances

**Simple Query:**
```
User: What's my USDC balance?

Claude:
Your Polygon wallet has 5,234.50 USDC
```

**Multi-Platform Query:**
```
User: Show me all my balances

Claude:
Here's your balance overview:

💎 Polygon Wallet
- USDC: 5,234.50
- MATIC: 12.45

🐙 Kraken Exchange
- EUR: 2,150.30
- USDC: 100.00
- BTC: 0.0023

💸 Wise Account
- EUR: 1,500.00
- GBP: 800.00
- USD: 250.00

Total (approximate EUR equivalent): ~9,500 EUR
```

### 2. Get Current Rates

**Single Rate:**
```
User: What's the USDC to EUR rate?

Claude:
Current USDC/EUR rate on Kraken: 0.92 EUR per USDC
(Last updated: 2 minutes ago)
```

**Multiple Rates:**
```
User: Compare USDC rates across platforms

Claude:
USDC Exchange Rates:

Kraken:
- USDC/EUR: 0.92
- USDC/USD: 1.00

Market Context:
- 24h change: -0.3%
- Best for large volumes: Kraken
```

### 3. Transaction History

```
User: Show my recent transactions

Claude:
Recent Transactions (last 7 days):

Polygon:
- Feb 18: Sent 1,000 USDC to Kraken
  TX: 0x123...abc
  Fee: 0.15 USDC

Kraken:
- Feb 18: Sold 1,000 USDC for 920 EUR
  Order: ABC-123
  Fee: 2.30 EUR

Wise:
- Feb 17: Sent 500 EUR to Revolut
  Transfer: TR-789
  Fee: 2.50 EUR
```

## Complex Operations

### 4. Top Up Revolut (Full Workflow)

**User Request:**
```
User: I need to top up my Revolut with 1,000 EUR
```

**Claude Response - Planning Phase:**
```
Claude:
I'll help you top up your Revolut with 1,000 EUR. Here's the plan:

1. Check USDC balance on Polygon
2. Get current USDC/EUR rate on Kraken
3. Calculate required USDC (~1,087 USDC + fees)
4. Transfer USDC from Polygon to Kraken
5. Sell USDC for EUR on Kraken
6. Withdraw EUR from Kraken to Wise
7. Transfer EUR from Wise to Revolut

Estimated fees:
- Polygon gas: ~0.50 USDC
- Kraken trading: ~2.50 EUR
- Kraken withdrawal: ~1.00 EUR
- Wise transfer: ~3.00 EUR
Total fees: ~7 EUR

Shall I proceed?
```

**User Confirmation:**
```
User: Yes, go ahead
```

**Claude Execution:**
```
Claude:
Starting the process...

✓ Step 1: Checked Polygon balance
  Available: 5,234 USDC ✓

✓ Step 2: Got Kraken rate
  USDC/EUR: 0.92

✓ Step 3: Calculated amounts
  Need: 1,087 USDC
  Will get: ~1,000 EUR (after fees)

✓ Step 4: Transferring USDC to Kraken
  Amount: 1,087 USDC
  TX: 0x456...def
  Status: Submitted to blockchain

⏳ Waiting for blockchain confirmations (usually 2-3 minutes)...
  [10 seconds] Confirmations: 2/12
  [30 seconds] Confirmations: 6/12
  [60 seconds] Confirmations: 10/12
  [90 seconds] Confirmations: 12/12
✓ Transaction confirmed on Polygon!

⏳ Step 5: Waiting for Kraken to detect and credit deposit...
  This usually takes 3-10 minutes after blockchain confirmation
  [1 minute] Checking... not yet credited
  [2 minutes] Checking... not yet credited
  [3 minutes] Checking... not yet credited
  [4 minutes] ✓ Deposit credited! 1,087 USDC now in Kraken

✓ Step 6: Selling USDC for EUR on Kraken
  Creating market order...
  Order ID: DEF-456

⏳ Waiting for order to fill...
  [5 seconds] Status: partially filled (30%)
  [8 seconds] Status: filled (100%)
✓ Order completed!
  Executed: 1,087 USDC → 1,000.04 EUR
  Fee: 2.50 EUR
  Net: 997.54 EUR

✓ Step 7: Initiating EUR withdrawal to Wise
  Amount: 997.54 EUR
  Withdrawal ID: WD-789

⏳ Waiting for Kraken to process withdrawal...
  This usually takes 1-3 business days
  [30 minutes] Status: pending approval
  [2 hours] Status: approved, processing
  [24 hours] ✓ Withdrawal completed! Sent to Wise
  Fee: 1.00 EUR
  Net sent: 996.54 EUR

⏳ Step 8: Waiting for Wise to receive funds...
  This usually takes 1-2 business days
  [1 day] Still waiting for incoming transfer...
  [2 days] ✓ Funds received in Wise account!

✓ Step 9: Creating transfer from Wise to Revolut
  Amount: 996.54 EUR
  Transfer ID: TR-012

⏳ Waiting for transfer to complete...
  This usually takes 2-12 hours
  [2 hours] Status: processing
  [4 hours] Status: funds converted
  [6 hours] Status: outgoing payment sent
  [8 hours] ✓ Transfer completed!
  Fee: 2.50 EUR
  Net to Revolut: 994.04 EUR

✅ Complete!

Summary:
- Started with: 1,087 USDC on Polygon
- Ended with: 994.04 EUR in Revolut
- Total fees: 7.46 EUR (0.75%)
- Time taken: ~3 days (2.5 days for bank transfers)
  • Polygon → Kraken: ~4 minutes
  • Kraken trade: ~8 seconds
  • Kraken → Wise: ~1 day
  • Wise → Revolut: ~8 hours

Transaction IDs for your records:
- Polygon TX: 0x456...def
- Kraken Deposit: Detected via blockchain
- Kraken Order: DEF-456
- Kraken Withdrawal: WD-789
- Wise Transfer: TR-012

Note: Bank transfers take business days. This is normal and expected.
```

### 5. Convert Crypto to Fiat (Keep in Kraken)

```
User: Convert 500 USDC to EUR and keep it in Kraken

Claude:
I'll convert 500 USDC to EUR on Kraken. Here's the plan:

1. Check current USDC/EUR rate
2. Estimate EUR amount after fees
3. Execute market sell order

Current rate: 0.92 EUR/USDC
Expected: ~460 EUR (after 0.26% fee)

Proceed?

User: Yes

Claude:
✓ Executed sell order
  Order ID: GHI-789
  Sold: 500 USDC
  Received: 459.80 EUR
  Fee: 1.20 EUR

Done! Your Kraken balance now has 459.80 EUR.
```

### 6. Emergency Withdrawal

```
User: Withdraw all my USDC from Polygon to Kraken immediately

Claude:
⚠️ Emergency withdrawal requested.

Current status:
- Polygon USDC: 5,234.50
- Kraken deposit address: 0xKraken...

This will:
1. Transfer ALL USDC to Kraken
2. Cost ~0.50 USDC in gas
3. Take 3-5 minutes to confirm

Are you sure? (This cannot be undone)

User: Yes, do it now

Claude:
✓ Initiating transfer
  Amount: 5,234.50 USDC
  To: Kraken deposit address
  TX: 0xABC...123

✓ Transaction submitted
  Status: Pending...
  Gas used: 0.48 USDC

✓ Confirmed!
  Net transferred: 5,234.02 USDC

✓ Kraken deposit detected
  Should appear in 3-5 minutes

I'll monitor and let you know when it's credited.

... 4 minutes later ...

✅ Confirmed! 5,234.02 USDC now available in your Kraken account.
```

## Advanced Workflows

### 7. Dollar-Cost Averaging

```
User: I want to convert 100 EUR to USDC every week

Claude:
I understand you want to do regular EUR → USDC conversions.

Currently, I can execute this manually when you ask. For automatic
scheduling, you would need to:

1. Set up a separate automation service
2. Or manually request each week

Would you like me to:
A) Do it now (100 EUR → USDC)?
B) Remind you to ask me weekly?
C) Explain how to set up automation?

User: A

Claude:
✓ Converting 100 EUR to USDC

Current rate: 1.09 USDC/EUR
Expected: ~109 USDC

Steps:
1. Use Kraken balance (you have 2,150 EUR)
2. Buy USDC with EUR
3. Leave in Kraken or withdraw to Polygon?

User: Leave in Kraken

Claude:
✓ Created buy order
  Order: JKL-456
  Bought: 108.73 USDC
  Fee: 0.27 EUR

Done! Your Kraken now has 208.73 USDC.
```

### 8. Rebalancing Portfolio

```
User: I want 50% of my Kraken balance in EUR, 50% in USDC

Claude:
Let me check your current Kraken balance...

Current:
- EUR: 2,150.30
- USDC: 208.73
- BTC: 0.0023 (~75 EUR)

Total value: ~2,634 EUR equivalent

Target 50/50 split:
- EUR: 1,317 EUR
- USDC: 1,317 EUR (1,434 USDC at current rate)

Required actions:
1. Keep BTC as is (too small to split)
2. Sell EUR 833.30 → USDC (expect ~908 USDC)

After rebalancing:
- EUR: 1,317 EUR (50%)
- USDC: 1,117 USDC (1,317 EUR value, 50%)
- BTC: 0.0023 (small amount, unchanged)

Fees: ~2 EUR

Proceed?

User: Yes

Claude:
✓ Selling EUR for USDC
  Order: MNO-789
  Sold: 833.30 EUR
  Received: 908.12 USDC
  Fee: 2.17 EUR

✅ Rebalanced!

Final Kraken balance:
- EUR: 1,315.03 (49.9%)
- USDC: 1,116.85 (1,315 EUR value, 50.0%)
- BTC: 0.0023 (0.1%)

Close enough to 50/50 target!
```

### 9. Cross-Currency Payment

```
User: Pay 500 GBP to my UK account from wherever it's cheapest

Claude:
Let me find the cheapest way to send 500 GBP...

Option 1: Wise GBP → UK account
- Available: 800 GBP in Wise
- Fee: 2.00 GBP
- Total cost: 502 GBP
- Time: Instant
- ✓ Cheapest option

Option 2: EUR → GBP via Wise
- Convert 2,150 EUR → GBP
- Rate: 1.17
- Fee: ~8 GBP
- Total cost: 508 GBP equivalent

Option 3: USDC → EUR → GBP
- Multiple conversions
- Higher fees
- Not recommended

Recommendation: Use Wise GBP balance (Option 1)

Proceed with Option 1?

User: Yes

Claude:
✓ Transferring from Wise GBP
  Amount: 500 GBP
  To: UK account (sort code: XX-XX-XX)
  Reference: Crown Hold transfer
  Fee: 2.00 GBP
  Transfer ID: TR-345

✓ Transfer initiated
  Expected arrival: 2 hours

Remaining Wise GBP balance: 298.00 GBP
```

## Monitoring & Alerts

### 10. Set Up Balance Alert

```
User: Let me know if my Polygon USDC goes below 1000

Claude:
I can check this when you ask, but I don't have continuous monitoring.

I can:
1. Check now and tell you current balance
2. Check when you request throughout the day
3. Suggest setting up external monitoring

For continuous monitoring, you could:
- Use Polygon wallet app notifications
- Set up blockchain alerts (e.g., Etherscan)
- Create a custom monitoring script

Would you like me to:
A) Check your balance now?
B) Explain how to set up monitoring?

User: A

Claude:
Current Polygon USDC balance: 3,147.22 USDC

You're well above the 1,000 threshold! ✓

I'll remind you to check periodically, or you can ask me
anytime with "Check my Polygon balance"
```

### 11. Transaction Audit

```
User: How much did I spend in fees this month?

Claude:
Analyzing February 2026 transactions...

Polygon Fees:
- 12 transactions
- Total gas: 6.45 USDC
- Average: 0.54 USDC per transaction

Kraken Fees:
- 8 trades
- Trading fees: 24.50 EUR
- Withdrawal fees: 3.00 EUR
- Total: 27.50 EUR

Wise Fees:
- 5 transfers
- Transfer fees: 12.50 EUR
- Total: 12.50 EUR

Total Fees (EUR equivalent):
- Polygon: ~6 EUR
- Kraken: 27.50 EUR
- Wise: 12.50 EUR
- Grand total: ~46 EUR

Transaction volume: ~8,500 EUR
Fee percentage: 0.54%

Tips to reduce fees:
- Batch smaller transactions
- Use limit orders on Kraken (lower fees)
- Consider fee-free transfer windows
```

## Error Handling

### 12. Insufficient Balance

```
User: Transfer 10,000 USDC to Kraken

Claude:
❌ Unable to complete transfer

Issue: Insufficient balance
- Required: 10,000 USDC + gas fees (~0.50 USDC)
- Available: 3,147.22 USDC
- Shortfall: 6,853.28 USDC

Options:
1. Transfer available amount (3,146.70 USDC)?
2. Check other platforms for USDC
3. Cancel and add more funds

What would you like to do?
```

### 13. Network Congestion

```
User: Transfer 1000 USDC to Kraken

Claude:
⚠️ Warning: High network congestion detected

Current gas prices:
- Fast: 250 gwei (~0.85 USDC)
- Standard: 150 gwei (~0.50 USDC)
- Slow: 80 gwei (~0.30 USDC)

Usually: ~50 gwei (~0.20 USDC)

Options:
1. Wait for lower gas (check again in 1 hour)
2. Proceed with standard gas (0.50 USDC)
3. Pay fast gas for quick confirmation (0.85 USDC)

Recommended: Option 1 (wait) unless urgent

Your choice?
```

### 14. API Error

```
User: What's my Kraken balance?

Claude:
❌ Error connecting to Kraken API

Error: Connection timeout after 30 seconds

This could mean:
- Kraken API is down (check status.kraken.com)
- Network connectivity issue
- Rate limit exceeded

Troubleshooting:
1. I'll retry in 30 seconds...

... retrying ...

✓ Connected successfully!

Your Kraken balance:
- EUR: 2,150.30
- USDC: 208.73

(There was a temporary connectivity issue, now resolved)
```

## Safety Practices

### 15. Pre-Transaction Checks

```
User: Send all my money to Revolut

Claude:
⚠️ Large operation requested - let me verify details first

"All my money" includes:
- Polygon: 3,147 USDC (~2,895 EUR)
- Kraken: 2,150 EUR + 209 USDC (~2,342 EUR)
- Wise: 1,500 EUR + 800 GBP (~2,436 EUR)
Total: ~7,673 EUR

This would:
1. Empty all your crypto/exchange accounts
2. Cost ~30-50 EUR in fees
3. Take several hours to complete
4. Be irreversible

⚠️ Important questions:
- Do you mean ALL accounts or just available EUR?
- Should I leave some for fees and emergencies?
- Is this intentional or a mistake?

Please confirm with specific amounts, or type CANCEL to stop.
```

## Next Steps

- Review [Architecture](architecture.md) to understand how workflows are executed
- Check [Claude Setup](claude-setup.md) for configuration
- See [Environment Setup](environment-setup.md) for security settings
- Read [MCP Servers](mcp-servers.md) for technical implementation
