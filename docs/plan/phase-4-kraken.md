# Phase 4: Kraken Integration

**Цель:** Заменить Kraken mock на реальную интеграцию с Kraken API

**Время:** 3-4 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 1-3 завершены

⚠️ **IMPORTANT:** Kraken не имеет sandbox API. Тестируем на real API с МАЛЫМИ СУММАМИ!

## Задачи

### 3.1 Kraken Client Setup

- [ ] Установить kraken-api library
- [ ] Создать KrakenRealService
- [ ] Настроить API authentication (Key + Secret)
- [ ] Реализовать nonce generation
- [ ] Добавить rate limiting
- [ ] Тестировать connection

### 3.2 Implement Real Tools

- [ ] `kraken_get_balances` - real account balances
- [ ] `kraken_get_ticker` - real market prices
- [ ] `kraken_deposit_address` - get real deposit address for Polygon USDC
- [ ] `kraken_check_deposit` - check if deposit credited
- [ ] `kraken_create_order` - create real market/limit orders
- [ ] `kraken_get_order_status` - check order execution
- [ ] `kraken_withdraw_fiat` - withdraw to Wise
- [ ] `kraken_get_withdrawal_status` - check withdrawal progress

### 3.3 API Key Setup

- [ ] Создать Kraken API key с минимальными permissions:
  - Query Funds ✓
  - Query Orders & Trades ✓
  - Create & Modify Orders ✓
  - Deposit Funds ✓
  - Withdraw Funds ✓
- [ ] Настроить IP whitelist (опционально, но рекомендуется)
- [ ] Добавить withdrawal methods в Kraken UI:
  - Wise bank account
- [ ] Сохранить credentials в .env

### 3.4 Mode Switching

- [ ] Реализовать фабрику Mock/Real service
- [ ] Добавить ENABLE_MOCK flag
- [ ] Оставить mock для unit тестов

### 3.5 Safety Measures

- [ ] Добавить strict validation всех inputs
- [ ] Реализовать максимальные лимиты для orders
- [ ] Логировать ВСЕ операции детально
- [ ] Добавить confirmation промпты для больших сумм
- [ ] Тестировать только с суммами < 10 EUR эквивалента

## Configuration

### .env для Kraken

```bash
NODE_ENV=development

# Kraken Configuration
ENABLE_MOCK=false
KRAKEN_API_URL=https://api.kraken.com
KRAKEN_API_KEY=your-api-key
KRAKEN_API_SECRET=your-api-secret

# Rate Limiting
KRAKEN_RATE_LIMIT_PER_SECOND=1
KRAKEN_RATE_LIMIT_PER_MINUTE=15
API_TIMEOUT_MS=30000

# Trading Limits (ВАЖНО!)
MAX_ORDER_SIZE_USDC=10  # Начинаем с малого!
MAX_ORDER_SIZE_EUR=10
MAX_WITHDRAWAL_AMOUNT_EUR=10

# Withdrawal Methods (setup in Kraken UI first)
WISE_WITHDRAWAL_KEY=your-wise-withdrawal-name

# Allowed Trading Pairs
ALLOWED_TRADING_PAIRS=USDCEUR,USDCUSD

# Logging
LOG_LEVEL=debug
LOG_FILE=/tmp/crown-kraken.log

# Alerting (optional)
ALERT_ON_TRADES=true
ALERT_ON_WITHDRAWALS=true
```

## Implementation Example

```typescript
// kraken/real.service.ts
import KrakenClient from 'kraken-api';

@Injectable()
export class KrakenRealService {
  private client: KrakenClient;
  private rateLimiter: RateLimiter;

  constructor(private config: ConfigService) {
    this.client = new KrakenClient(
      config.get('KRAKEN_API_KEY'),
      config.get('KRAKEN_API_SECRET')
    );

    this.rateLimiter = new RateLimiter({
      perSecond: config.get('KRAKEN_RATE_LIMIT_PER_SECOND'),
      perMinute: config.get('KRAKEN_RATE_LIMIT_PER_MINUTE'),
    });
  }

  async getBalances(): Promise<BalancesResult> {
    await this.rateLimiter.wait();

    try {
      const response = await this.client.api('Balance');

      this.logger.log('Fetched balances from Kraken');

      return {
        success: true,
        data: response.result,
      };
    } catch (error) {
      this.logger.error('Failed to get balances', error);
      return {
        success: false,
        error: {
          code: 'BALANCE_ERROR',
          message: error.message,
        },
      };
    }
  }

  async createOrder(params: OrderParams): Promise<OrderResult> {
    await this.rateLimiter.wait();

    try {
      // Validate
      this.validateTradingPair(params.pair);
      this.validateOrderSize(params.volume, params.pair);

      // Log before execution
      this.logger.warn('Creating order', {
        pair: params.pair,
        type: params.type,
        volume: params.volume,
      });

      // Execute
      const response = await this.client.api('AddOrder', {
        pair: params.pair,
        type: params.type,
        ordertype: params.ordertype || 'market',
        volume: params.volume.toString(),
        price: params.price?.toString(),
      });

      this.logger.log('Order created', {
        txid: response.result.txid,
      });

      return {
        success: true,
        data: {
          orderId: response.result.txid[0],
          pair: params.pair,
          type: params.type,
          volume: params.volume,
          status: 'pending',
        },
      };
    } catch (error) {
      this.logger.error('Failed to create order', error);
      return {
        success: false,
        error: {
          code: 'ORDER_ERROR',
          message: error.message,
        },
      };
    }
  }

  async checkDeposit(
    txHash: string,
    currency: string
  ): Promise<DepositResult> {
    await this.rateLimiter.wait();

    try {
      const response = await this.client.api('DepositStatus', {
        asset: currency,
        method: 'Polygon', // For USDC on Polygon
      });

      // Find deposit matching tx hash
      const deposits = response.result;
      const deposit = deposits.find(
        (d) => d.txid === txHash || d.info === txHash
      );

      if (!deposit) {
        return {
          success: true,
          data: {
            credited: false,
            status: 'not_found',
          },
        };
      }

      return {
        success: true,
        data: {
          credited: deposit.status === 'Success',
          amount: deposit.amount,
          currency: currency,
          status: deposit.status,
          creditedAt: deposit.time
            ? new Date(deposit.time * 1000).toISOString()
            : null,
        },
      };
    } catch (error) {
      this.logger.error('Failed to check deposit', error);
      return {
        success: false,
        error: {
          code: 'DEPOSIT_CHECK_ERROR',
          message: error.message,
        },
      };
    }
  }

  private validateOrderSize(volume: number, pair: string) {
    const currency = pair.slice(-3); // EUR, USD, etc.
    const maxSize = this.config.get(`MAX_ORDER_SIZE_${currency}`);

    if (volume > maxSize) {
      throw new Error(
        `Order size ${volume} exceeds maximum ${maxSize} ${currency}`
      );
    }
  }

  private validateTradingPair(pair: string) {
    const allowed = this.config
      .get('ALLOWED_TRADING_PAIRS')
      .split(',');

    if (!allowed.includes(pair)) {
      throw new Error(`Trading pair ${pair} not allowed`);
    }
  }
}
```

## Testing Strategy

### Phase 1: Read-Only Testing

```
Test with API key that has ONLY:
- Query Funds
- Query Orders & Trades

Commands:
1. "What's my Kraken balance?"
2. "What's the USDC/EUR rate?"
3. "Show my recent orders"

Expected: All read operations work
```

### Phase 2: Small Deposits

```
1. Get Polygon USDC deposit address from Kraken
2. Send 1 USDC from testnet to Kraken
3. Wait and check deposit status
4. Verify credited to balance

Expected: Deposit appears in Kraken account
```

### Phase 3: Small Trades

```
With 1-2 EUR equivalent in account:

1. "Sell 1 USDC for EUR"
2. Wait for order to fill
3. Check new balances
4. Verify in Kraken UI

Expected: Order executes, balances update
```

### Phase 4: Withdrawals (CAREFUL!)

```
Setup Wise withdrawal method in Kraken UI first!

With 5 EUR in account:

1. "Withdraw 5 EUR to Wise"
2. Wait for processing
3. Check withdrawal status
4. Verify in Wise account

Expected: EUR appears in Wise
```

## Safety Checklist

Before testing with real API:

- [ ] API key has IP restrictions (recommended)
- [ ] MAX_ORDER_SIZE limits are set low (< 10 EUR)
- [ ] All operations are logged
- [ ] Withdrawal methods are verified
- [ ] Testing with minimal amounts
- [ ] Have manually verified all recipient details
- [ ] Understand all fees involved
- [ ] Can manually reverse operations if needed

## Common Issues & Solutions

### Issue: API authentication fails

**Solution:**
```
1. Verify API key and secret are correct
2. Check nonce is incrementing
3. Ensure no clock skew (NTP sync)
4. Check API key permissions
```

### Issue: Deposit not showing

**Solution:**
```
1. Check transaction on Polygonscan
2. Verify sufficient confirmations (30-50)
3. Wait additional 5-10 minutes
4. Contact Kraken support if > 30 min
```

### Issue: Order fails

**Solution:**
```
1. Check balance is sufficient
2. Verify trading pair is correct
3. Check min order size requirements
4. Ensure price is reasonable (for limit orders)
```

## Критерии завершения Phase 3

- ✅ Kraken Real Service полностью реализован
- ✅ Все tools работают с реальным API
- ✅ Протестирован депозит с малой суммой
- ✅ Протестирован trade с малой суммой
- ✅ Протестирован withdrawal (optional, but recommended)
- ✅ Все операции детально логируются
- ✅ Safety limits соблюдаются
- ✅ Error handling обрабатывает API errors

## Результат Phase 3

**Deliverables:**
- Работающая интеграция с Kraken API
- Реальные trades и deposits
- Withdrawal functionality
- Comprehensive logging

**Что можно сделать:**
- ✅ Реальные депозиты crypto на Kraken
- ✅ Торговля crypto ↔ fiat
- ✅ Выводы на Wise
- ✅ Полный flow: Polygon → Kraken → Wise

## Следующий шаг

После завершения Phase 4 переходим к [Phase 5: Wise Integration](phase-5-wise.md)
