# Phase 1C: Read-Only + Transaction Simulation

**Цель:** Протестировать интеграцию с реальными API используя read-only операции и симуляцию транзакций

**Время:** 2-3 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 1B завершена (все моки работают)

## Зачем Phase 1C?

После Phase 1B мы знаем что **моки работают**. Но перед тем как давать системе реальный доступ к деньгам, нужно:

1. **Проверить API credentials** - работают ли ключи?
2. **Увидеть реальные данные** - какие на самом деле балансы, цены?
3. **Протестировать логику** - правильно ли мы обрабатываем реальные ответы API?
4. **Отладить edge cases** - что если баланс = 0? Что если нестандартный формат?
5. **Безопасно протестировать workflows** - полная цепочка без риска

**Phase 1C = Real data + Simulated writes = Zero risk testing**

## Принцип работы

### Read-Only Operations (Real API)
Читаем реальные данные с API:
- ✅ Балансы
- ✅ Цены и курсы
- ✅ Адреса для депозитов
- ✅ Recipients
- ✅ Transaction history
- ✅ Gas estimates

**Риск:** 🟢 Нет (только чтение)

### Write Operations (Simulated)
Все операции изменения симулируются:
- 🔶 Transfers → Валидация + Dry Run
- 🔶 Orders → Валидация + Calculation
- 🔶 Withdrawals → Валидация + Simulation

**Процесс симуляции:**
1. Валидируем параметры против реальных данных
2. Проверяем балансы (достаточно ли средств?)
3. Вычисляем fees и результаты
4. Логируем что БЫЛО БЫ выполнено
5. Обновляем локальный state (не реальный!)
6. Возвращаем mock результат с пометкой [SIMULATED]

## Задачи

### 1.1 Polygon: Read-Only + Simulation Mode

#### Read-Only Tools (Real API)
- [ ] `polygon_get_balance` - реальный баланс с Polygon RPC
- [ ] `polygon_get_token_price` - реальная цена через Chainlink или DEX
- [ ] `polygon_get_transactions` - реальная история из Polygonscan API
- [ ] `polygon_estimate_gas` - реальная оценка газа

**Implementation:**
```typescript
// Use ethers.js v6
const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
const usdcContract = new ethers.Contract(USDC_ADDRESS, ABI, provider);

async function getRealBalance() {
  const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
  const matic = await provider.getBalance(WALLET_ADDRESS);
  return { usdc: formatUnits(balance, 6), matic: formatEther(matic) };
}
```

#### Simulated Tools
- [ ] `polygon_transfer_usdc` - **SIMULATION MODE**

**Simulation Logic:**
```typescript
async function simulateTransfer(recipient: string, amount: string) {
  // 1. Validate with real data
  const realBalance = await getRealBalance();
  if (parseFloat(amount) > parseFloat(realBalance.usdc)) {
    return error('INSUFFICIENT_BALANCE', 'Real balance check failed');
  }

  // 2. Estimate real gas
  const gasEstimate = await estimateRealGas(recipient, amount);

  // 3. Create simulation result
  const mockTxHash = '0xSIMULATED_' + crypto.randomBytes(32).toString('hex');

  console.log('[SIMULATION] Would transfer:', {
    from: WALLET_ADDRESS,
    to: recipient,
    amount,
    gasEstimate,
    realBalanceBefore: realBalance.usdc,
    note: 'THIS IS A SIMULATION - NO REAL TRANSACTION',
  });

  // 4. Return mock result with clear indication
  return {
    success: true,
    simulated: true,
    data: {
      transactionHash: mockTxHash,
      from: WALLET_ADDRESS,
      to: recipient,
      amount,
      status: 'simulated',
      gasEstimate,
      realBalanceChecked: true,
      warning: '⚠️ SIMULATION MODE - No real transaction was sent',
    },
  };
}
```

**Result:** Polygon integration с реальными read операциями, симулированными writes

---

### 1.2 Kraken: Read-Only + Simulation Mode

#### Read-Only Tools (Real API)
- [ ] `kraken_get_balances` - реальные балансы через Kraken API
- [ ] `kraken_get_ticker` - реальные цены
- [ ] `kraken_deposit_address` - реальный адрес депозита
- [ ] `kraken_get_deposit_status` - проверка реальных депозитов
- [ ] `kraken_get_order_status` - статус существующих ордеров (если есть)
- [ ] `kraken_get_withdrawal_status` - статус существующих withdrawals

**Implementation:**
```typescript
// Use Kraken REST API
const client = axios.create({
  baseURL: 'https://api.kraken.com',
});

async function getRealBalances() {
  const nonce = Date.now() * 1000;
  const signature = generateKrakenSignature('/0/private/Balance', nonce, {});

  const response = await client.post('/0/private/Balance',
    qs.stringify({ nonce }),
    {
      headers: {
        'API-Key': KRAKEN_API_KEY,
        'API-Sign': signature,
      },
    }
  );

  return response.data.result;
}
```

#### Simulated Tools
- [ ] `kraken_create_order` - **SIMULATION MODE**
- [ ] `kraken_withdraw_fiat` - **SIMULATION MODE**

**Simulation Logic:**
```typescript
async function simulateOrder(pair: string, type: string, volume: string) {
  // 1. Get real balances
  const realBalances = await getRealBalances();

  // 2. Get real ticker
  const realPrice = await getRealTicker(pair);

  // 3. Validate order would be possible
  if (type === 'sell') {
    const [base] = pair.split(/EUR|USD/);
    if (parseFloat(volume) > parseFloat(realBalances[base] || '0')) {
      return error('INSUFFICIENT_BALANCE', 'Real balance check failed');
    }
  }

  // 4. Calculate what would happen
  const cost = parseFloat(realPrice) * parseFloat(volume);
  const fee = cost * 0.0026; // Real Kraken fee

  console.log('[SIMULATION] Would create order:', {
    pair,
    type,
    volume,
    price: realPrice,
    cost,
    fee,
    realBalances,
    note: 'THIS IS A SIMULATION - NO REAL ORDER',
  });

  // 5. Return simulation result
  return {
    success: true,
    simulated: true,
    data: {
      orderId: 'SIMULATED-ORD-' + Date.now(),
      pair,
      type,
      volume,
      price: realPrice,
      estimatedCost: cost.toFixed(2),
      estimatedFee: fee.toFixed(2),
      status: 'simulated',
      realDataUsed: true,
      warning: '⚠️ SIMULATION MODE - No real order was created',
    },
  };
}
```

**Result:** Kraken integration с реальными данными, симулированными операциями

---

### 1.3 Wise: Read-Only + Simulation Mode

#### Read-Only Tools (Real API)
- [ ] `wise_get_balances` - реальные балансы
- [ ] `wise_get_rate` - реальные курсы
- [ ] `wise_get_recipients` - реальные recipients
- [ ] `wise_get_transfer_status` - статус существующих transfers

**Implementation:**
```typescript
// Use Wise API (sandbox or production read-only)
const client = axios.create({
  baseURL: WISE_SANDBOX_URL, // or production for read-only
  headers: {
    'Authorization': `Bearer ${WISE_API_TOKEN}`,
  },
});

async function getRealBalances() {
  const response = await client.get(
    `/v4/profiles/${WISE_PROFILE_ID}/balances`,
    { params: { types: 'STANDARD' } }
  );

  return response.data;
}

async function getRealRecipients() {
  const response = await client.get('/v1/accounts', {
    params: { profileId: WISE_PROFILE_ID },
  });

  return response.data;
}
```

#### Simulated Tools
- [ ] `wise_create_transfer` - **SIMULATION MODE**

**Simulation Logic:**
```typescript
async function simulateTransfer(
  recipientId: string,
  sourceAmount: string,
  sourceCurrency: string
) {
  // 1. Get real balance
  const realBalances = await getRealBalances();
  const balance = realBalances.find(b => b.currency === sourceCurrency);

  if (parseFloat(sourceAmount) > parseFloat(balance?.amount?.value || '0')) {
    return error('INSUFFICIENT_BALANCE', 'Real balance check failed');
  }

  // 2. Get real recipient
  const realRecipients = await getRealRecipients();
  const recipient = realRecipients.find(r => r.id === recipientId);

  if (!recipient) {
    return error('RECIPIENT_NOT_FOUND', 'Real recipient check failed');
  }

  // 3. Create real quote (does not execute)
  const realQuote = await createRealQuote({
    sourceCurrency,
    targetCurrency: recipient.currency,
    sourceAmount,
    targetAccount: recipientId,
  });

  console.log('[SIMULATION] Would create transfer:', {
    recipient: recipient.name,
    sourceAmount,
    sourceCurrency,
    targetAmount: realQuote.targetAmount,
    rate: realQuote.rate,
    fee: realQuote.fee,
    realBalanceBefore: balance?.amount?.value,
    note: 'THIS IS A SIMULATION - NO REAL TRANSFER',
  });

  // 4. Return simulation (do NOT fund the transfer!)
  return {
    success: true,
    simulated: true,
    data: {
      transferId: 'SIMULATED-TRF-' + Date.now(),
      quoteId: realQuote.id, // Real quote ID (expires in 30 min)
      recipient: recipient.name,
      sourceAmount,
      sourceCurrency,
      targetAmount: realQuote.targetAmount,
      targetCurrency: recipient.currency,
      rate: realQuote.rate,
      fee: realQuote.fee,
      status: 'simulated',
      realDataUsed: true,
      warning: '⚠️ SIMULATION MODE - Quote created but not funded',
      note: 'To execute for real, would need to call funding endpoint',
    },
  };
}
```

**Important:** Wise allows creating quotes without funding them. This is perfect for simulation!

**Result:** Wise integration с реальными данными и quotes, но без реального funding

---

## Конфигурация

### Environment Variables

```bash
# Phase 1C: Read-Only + Simulation
NODE_ENV=development
MODE=read_only_simulation

# Polygon (Mumbai Testnet for now, or Mainnet read-only)
POLYGON_NETWORK=mumbai
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
WALLET_ADDRESS=0x...your-address  # Public address only, no private key needed for reads!
USDC_CONTRACT_ADDRESS=0x...testnet-usdc

# For simulation (optional, only if you want to simulate writes)
WALLET_PRIVATE_KEY=0x...your-key  # Only stored locally, only used for simulation validation

# Kraken (Real API, Read-Only permissions)
KRAKEN_API_URL=https://api.kraken.com
KRAKEN_API_KEY=...your-key
KRAKEN_API_SECRET=...your-secret
# Note: Create API key with ONLY "Query" permissions, NO "Trade" or "Withdraw"!

# Wise (Sandbox for testing)
WISE_ENVIRONMENT=sandbox
WISE_SANDBOX_URL=https://api.sandbox.transferwise.tech
WISE_SANDBOX_API_TOKEN=...sandbox-token
WISE_SANDBOX_PROFILE_ID=...sandbox-profile

# Simulation settings
SIMULATION_MODE=true
LOG_SIMULATIONS=true
SIMULATION_LOG_FILE=/tmp/crown-simulation.log
```

### API Key Safety

**Kraken API Key Permissions:**
```
✅ Query Funds
✅ Query Open Orders & Trades
✅ Query Closed Orders & Trades
✅ Query Ledger Entries
❌ Create & Modify Orders (DISABLED)
❌ Withdraw Funds (DISABLED)
❌ Cancel/Close Orders (DISABLED)
```

**Wise API Token:**
- Use **sandbox** environment (fake money)
- Or use **production** with read-only token (if available)

**Polygon:**
- **No private key needed for reads!**
- Only public address for balance checks
- Private key only for simulation validation (offline, no broadcasts)

---

## Testing Strategy

### Stage 1: Read-Only Verification

Test each platform's read operations:

```bash
# Test 1: Polygon balances (real)
User: "What's my USDC balance on Polygon?"
Expected: Real balance from blockchain

# Test 2: Kraken balances (real)
User: "What's my Kraken balance?"
Expected: Real balances from Kraken API

# Test 3: Wise balances (real)
User: "What's my Wise balance?"
Expected: Real balances from Wise API (sandbox)

# Test 4: Real prices
User: "What's the current USDC/EUR rate on Kraken?"
Expected: Real market price
```

### Stage 2: Simulation Verification

Test simulated write operations:

```bash
# Test 5: Simulated transfer
User: "Transfer 100 USDC to Kraken"
Expected:
- Checks real Polygon balance
- Estimates real gas
- Shows what WOULD happen
- Returns [SIMULATED] result
- NO real transaction sent

# Test 6: Simulated order
User: "Sell 50 USDC for EUR on Kraken"
Expected:
- Checks real balance
- Gets real price
- Calculates real fee
- Shows what WOULD happen
- Returns [SIMULATED] result
- NO real order created

# Test 7: Simulated Wise transfer
User: "Send 100 EUR to Revolut via Wise"
Expected:
- Checks real balance
- Gets real recipient
- Creates real quote
- Shows what WOULD happen
- Returns [SIMULATED] result
- Quote NOT funded (expires)
```

### Stage 3: Full Workflow Simulation

```bash
# Test 8: Full workflow simulation
User: "Top up my Revolut with 100 EUR (simulation)"

Expected workflow:
1. Check real Polygon balance ✓
2. Check real Kraken balances ✓
3. Get real USDC/EUR rate ✓
4. [SIMULATE] Transfer USDC Polygon → Kraken
5. [SIMULATE] Wait for deposit (show timing)
6. [SIMULATE] Sell USDC for EUR
7. [SIMULATE] Withdraw EUR to Wise
8. Get real Wise recipients ✓
9. [SIMULATE] Transfer EUR to Revolut

Result: Complete log of what WOULD happen with real data
Time: ~1 minute (no real waits)
Risk: ZERO
```

---

## Logging & Auditing

### Simulation Log Format

```typescript
// Every simulation logged to file
{
  timestamp: '2026-02-21T10:30:00Z',
  mode: 'SIMULATION',
  operation: 'polygon_transfer_usdc',
  parameters: {
    recipient: '0xKRAKEN...',
    amount: '100.00',
  },
  realDataChecks: {
    balanceChecked: true,
    realBalance: '5234.50',
    sufficient: true,
    gasEstimate: '0.01 MATIC',
  },
  simulationResult: {
    wouldSucceed: true,
    estimatedCost: '100.00 USDC + 0.01 MATIC',
    estimatedTime: '24 seconds',
    newBalance: '5134.50 USDC',
  },
  realTransactionSent: false,
  note: 'THIS WAS A SIMULATION',
}
```

### Console Output

```
[SIMULATION MODE] ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Operation: Transfer USDC
From: Polygon
To: Kraken (0xKRAKEN...)
Amount: 100.00 USDC

Real Data Checks:
✓ Current balance: 5,234.50 USDC (sufficient)
✓ Gas estimate: 0.01 MATIC
✓ Recipient address: valid

Simulation Result:
→ Transaction would be sent
→ TX hash: 0xSIMULATED_abc123...
→ Estimated time: 24 seconds
→ New balance: 5,134.50 USDC

⚠️ NO REAL TRANSACTION WAS SENT
This was a simulation using real data.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Implementation Structure

### Code Organization

```typescript
// services/polygon/polygon.service.ts
export class PolygonService {
  constructor(
    private readonly mode: 'mock' | 'read_only_simulation' | 'production'
  ) {}

  async getBalance() {
    if (this.mode === 'mock') {
      return this.mockService.getBalance();
    }
    // Read-only: Always use real API
    return this.realService.getBalance();
  }

  async transferUSDC(recipient: string, amount: string) {
    if (this.mode === 'mock') {
      return this.mockService.transferUSDC(recipient, amount);
    }

    if (this.mode === 'read_only_simulation') {
      return this.simulationService.simulateTransfer(recipient, amount);
    }

    // Production: Real transaction
    return this.realService.transferUSDC(recipient, amount);
  }
}
```

### Simulation Service

```typescript
// services/polygon/simulation.service.ts
export class PolygonSimulationService {
  async simulateTransfer(recipient: string, amount: string) {
    // 1. Validate with real data
    const realBalance = await this.realService.getBalance();
    const gasEstimate = await this.realService.estimateGas(recipient, amount);

    // 2. Validate parameters
    if (parseFloat(amount) > parseFloat(realBalance.usdc)) {
      throw new Error('Insufficient balance (real balance checked)');
    }

    // 3. Log simulation
    this.logger.logSimulation({
      operation: 'transfer_usdc',
      params: { recipient, amount },
      realBalance,
      gasEstimate,
      result: 'would_succeed',
    });

    // 4. Return simulation result
    return {
      success: true,
      simulated: true,
      data: {
        transactionHash: this.generateSimulatedTxHash(),
        status: 'simulated',
        realBalanceChecked: true,
        gasEstimate,
        warning: '⚠️ SIMULATION - No real transaction sent',
      },
    };
  }
}
```

---

## Safety Features

### 1. Clear Indicators

Every simulated response includes:
- ✅ `simulated: true` flag
- ✅ `⚠️ SIMULATION MODE` warning in response
- ✅ Transaction hashes prefixed with `SIMULATED_`
- ✅ Status marked as `simulated`

### 2. Comprehensive Logging

- ✅ All simulations logged to file
- ✅ Timestamp, parameters, results
- ✅ Real data used for validation
- ✅ Clear note: "NO REAL TRANSACTION"

### 3. Environment Guards

```typescript
// Prevent accidental production writes
if (MODE === 'read_only_simulation' && isWriteOperation) {
  if (ALLOW_REAL_WRITES !== 'true') {
    throw new Error('Write operations disabled in simulation mode');
  }
}
```

### 4. API Key Restrictions

- Kraken: Query-only permissions
- Wise: Sandbox environment (or read-only token)
- Polygon: No private key for production

---

## Критерии завершения Phase 1C

- ✅ Все read-only операции используют реальные API
- ✅ Все write операции симулируются безопасно
- ✅ Реальные балансы, цены, курсы отображаются
- ✅ Симуляции валидируются против реальных данных
- ✅ Все симуляции четко помечены
- ✅ Логирование всех симуляций работает
- ✅ Можно протестировать полный workflow без риска
- ✅ API credentials работают корректно
- ✅ Обработка ошибок работает с реальными данными

## Результат Phase 1C

**Deliverables:**
1. Три MCP сервера с read-only + simulation режимом
2. Интеграция с реальными API для чтения
3. Безопасная симуляция всех write операций
4. Comprehensive logging всех симуляций
5. Валидация против реальных данных
6. Документация по настройке API keys

**Что можно сделать:**
- ✅ Видеть реальные балансы на всех платформах
- ✅ Получать реальные цены и курсы
- ✅ Тестировать workflows с реальными данными
- ✅ Валидировать логику без риска
- ✅ Находить edge cases на реальных данных
- ✅ Убедиться что API keys работают
- ✅ Подготовиться к production без страха

## Следующий шаг

После завершения Phase 1C переходим к [Phase 2: Research & API Analysis](phase-2-research.md)

Теперь мы **уверены** что:
- ✅ API credentials работают
- ✅ Мы правильно парсим реальные ответы
- ✅ Логика валидации корректна
- ✅ Workflows работают с реальными данными
- ✅ Готовы к настоящим операциям

---

**Phase 1C = Maximum confidence, Zero risk** 🛡️
