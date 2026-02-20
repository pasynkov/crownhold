# Phase 4: Wise Integration

**Цель:** Заменить Wise mock на реальную интеграцию с Wise API

**Время:** 2-3 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 1, 2, 3 завершены

✅ **GOOD NEWS:** Wise имеет sandbox API для тестирования!

## Задачи

### 4.1 Wise Client Setup

- [ ] Установить axios
- [ ] Создать WiseRealService
- [ ] Настроить API authentication (Bearer token)
- [ ] Реализовать для sandbox и production
- [ ] Добавить rate limiting
- [ ] Тестировать connection

### 4.2 Implement Real Tools

- [ ] `wise_get_balances` - real multi-currency balances
- [ ] `wise_get_rate` - real exchange rates
- [ ] `wise_create_transfer` - create real transfers
- [ ] `wise_get_transfer_status` - track transfer progress
- [ ] `wise_get_recipients` - list configured recipients

### 4.3 Sandbox Testing

- [ ] Создать Wise sandbox account
- [ ] Получить sandbox API token
- [ ] Добавить test recipients
- [ ] Протестировать все tools на sandbox
- [ ] Верифицировать transfers в sandbox

### 4.4 Production Setup

- [ ] Получить production API token
- [ ] Добавить реальных recipients (Revolut, etc.)
- [ ] Настроить verification (если требуется)
- [ ] Протестировать с малыми суммами

### 4.5 Mode Switching

- [ ] Реализовать Mock/Sandbox/Production modes
- [ ] Добавить WISE_ENVIRONMENT flag
- [ ] Конфигурировать base URLs

## Configuration

### .env для Wise

```bash
NODE_ENV=development

# Wise Configuration
ENABLE_MOCK=false
WISE_ENVIRONMENT=sandbox  # mock | sandbox | production
WISE_SANDBOX_URL=https://api.sandbox.transferwise.tech
WISE_PRODUCTION_URL=https://api.wise.com

# Sandbox Credentials
WISE_SANDBOX_API_TOKEN=your-sandbox-token
WISE_SANDBOX_PROFILE_ID=your-sandbox-profile-id

# Production Credentials (when ready)
WISE_PRODUCTION_API_TOKEN=
WISE_PRODUCTION_PROFILE_ID=

# Recipients (setup in Wise UI first)
REVOLUT_RECIPIENT_ID=12345678
REVOLUT_RECIPIENT_NAME=MyRevolutAccount

# Transfer Limits
MAX_TRANSFER_AMOUNT_EUR=50
MAX_TRANSFER_AMOUNT_GBP=50
MAX_TRANSFER_AMOUNT_USD=50

# Allowed Currencies
ALLOWED_CURRENCIES=EUR,GBP,USD

# Rate Limiting
WISE_RATE_LIMIT_PER_MINUTE=60
API_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=debug
LOG_FILE=/tmp/crown-wise.log
```

## Implementation Example

```typescript
// wise/real.service.ts
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WiseRealService {
  private client: AxiosInstance;
  private profileId: string;

  constructor(private config: ConfigService) {
    this.initializeClient();
    this.initializeProfile();
  }

  private initializeClient() {
    const env = this.config.get('WISE_ENVIRONMENT');
    const baseURL =
      env === 'production'
        ? this.config.get('WISE_PRODUCTION_URL')
        : this.config.get('WISE_SANDBOX_URL');

    const token =
      env === 'production'
        ? this.config.get('WISE_PRODUCTION_API_TOKEN')
        : this.config.get('WISE_SANDBOX_API_TOKEN');

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: this.config.get('API_TIMEOUT_MS'),
    });
  }

  private async initializeProfile() {
    // Get profile ID on startup
    const env = this.config.get('WISE_ENVIRONMENT');
    this.profileId =
      env === 'production'
        ? this.config.get('WISE_PRODUCTION_PROFILE_ID')
        : this.config.get('WISE_SANDBOX_PROFILE_ID');
  }

  async getBalances(): Promise<BalancesResult> {
    try {
      const response = await this.client.get(
        `/v4/profiles/${this.profileId}/balances`,
        {
          params: { types: 'STANDARD' },
        }
      );

      this.logger.log('Fetched balances from Wise');

      return {
        success: true,
        data: {
          balances: response.data.map((b) => ({
            currency: b.currency,
            amount: b.amount.value,
            available: b.amount.value, // Wise structure
          })),
        },
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

  async createTransfer(params: TransferParams): Promise<TransferResult> {
    try {
      // Validate
      this.validateRecipient(params.recipient);
      this.validateAmount(params.amount, params.currency);

      // Get recipient ID
      const recipientId = this.config.get(
        `${params.recipient.toUpperCase()}_RECIPIENT_ID`
      );

      // Create quote
      const quote = await this.createQuote({
        sourceCurrency: params.currency,
        targetCurrency: params.currency,
        sourceAmount: params.amount,
        targetAccount: recipientId,
      });

      // Create transfer
      const transfer = await this.client.post('/v1/transfers', {
        targetAccount: recipientId,
        quoteUuid: quote.id,
        customerTransactionId: this.generateUniqueId(),
        details: {
          reference: params.reference || 'Crown Hold transfer',
        },
      });

      // Fund transfer from balance
      await this.client.post(
        `/v3/profiles/${this.profileId}/transfers/${transfer.data.id}/payments`,
        {
          type: 'BALANCE',
        }
      );

      this.logger.log('Transfer created and funded', {
        transferId: transfer.data.id,
      });

      return {
        success: true,
        data: {
          transferId: transfer.data.id,
          recipient: params.recipient,
          amount: params.amount,
          currency: params.currency,
          fee: quote.fee,
          status: 'processing',
        },
      };
    } catch (error) {
      this.logger.error('Failed to create transfer', error);
      return {
        success: false,
        error: {
          code: 'TRANSFER_ERROR',
          message: error.message,
        },
      };
    }
  }

  async getTransferStatus(
    transferId: string
  ): Promise<TransferStatusResult> {
    try {
      const response = await this.client.get(`/v1/transfers/${transferId}`);

      const transfer = response.data;

      return {
        success: true,
        data: {
          transferId: transfer.id,
          status: transfer.status,
          sourceAmount: transfer.sourceValue,
          sourceCurrency: transfer.sourceCurrency,
          targetAmount: transfer.targetValue,
          targetCurrency: transfer.targetCurrency,
          rate: transfer.rate,
          fee: transfer.fee,
          createdAt: transfer.created,
          completedAt:
            transfer.status === 'completed' ? transfer.completed : null,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get transfer status', error);
      return {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: error.message,
        },
      };
    }
  }

  private async createQuote(params: QuoteParams) {
    const response = await this.client.post(
      `/v3/profiles/${this.profileId}/quotes`,
      params
    );
    return response.data;
  }

  private generateUniqueId(): string {
    return `crown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateAmount(amount: number, currency: string) {
    const maxAmount = this.config.get(`MAX_TRANSFER_AMOUNT_${currency}`);
    if (amount > maxAmount) {
      throw new Error(
        `Amount ${amount} exceeds maximum ${maxAmount} ${currency}`
      );
    }
  }
}
```

## Testing Strategy

### Stage 1: Sandbox Testing

```bash
# Set environment to sandbox
WISE_ENVIRONMENT=sandbox

Test Commands:
1. "What's my Wise balance?" (sandbox balance)
2. "What's the EUR/GBP exchange rate?"
3. "Transfer 10 EUR to test recipient"
4. "Check status of transfer TR-123"

Expected: All operations work in sandbox, no real money
```

### Stage 2: Production with Small Amounts

```bash
# Set environment to production
WISE_ENVIRONMENT=production

Test Commands (with 20-50 EUR):
1. "Transfer 10 EUR to Revolut"
2. Monitor transfer progress
3. Verify in Revolut account

Expected: Real transfer completes successfully
```

## Sandbox vs Production

| Aspect | Sandbox | Production |
|--------|---------|------------|
| API URL | api.sandbox.transferwise.tech | api.wise.com |
| Money | Fake | Real |
| Transfers | Simulated | Real banks |
| Recipients | Test accounts | Real accounts |
| Verification | None needed | May require docs |

## Wise Sandbox Setup

1. **Register:** https://sandbox.transferwise.tech/register
2. **Create API token:** Settings → API tokens
3. **Add test balance:** Use sandbox UI to add test funds
4. **Add recipients:** Add test recipients
5. **Get profile ID:**
   ```bash
   curl -X GET https://api.sandbox.transferwise.tech/v1/profiles \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Critical Features

### Transfer Status Timeline

Wise transfers go through stages:
```
processing
  ↓
funds_converted (if currency exchange)
  ↓
outgoing_payment_sent
  ↓
completed (or bounced_back/funds_refunded on error)
```

Poll status every 60 seconds until completed.

### Quote Expiry

Quotes expire after ~30 minutes. Create transfer promptly after quote.

### Balance Funding

Must fund transfer from balance after creation:
```typescript
POST /v3/profiles/{profileId}/transfers/{transferId}/payments
Body: { type: "BALANCE" }
```

## Safety Checklist

- [ ] Sandbox thoroughly tested
- [ ] Recipients verified in Wise UI
- [ ] Transfer limits set low for initial testing
- [ ] All operations logged
- [ ] Have verified recipient bank details manually
- [ ] Understand transfer fees
- [ ] Know transfer timeframes (usually 1-24h)

## Критерии завершения Phase 4

- ✅ Wise Real Service реализован
- ✅ Sandbox testing completed successfully
- ✅ Production tested with small amount (10-20 EUR)
- ✅ Transfer status tracking works
- ✅ All operations logged
- ✅ Error handling works correctly
- ✅ Can switch between mock/sandbox/production

## Результат Phase 4

**Deliverables:**
- Работающая интеграция с Wise API
- Sandbox и production modes
- Реальные международные переводы
- Status tracking с timeline

**Что можно сделать:**
- ✅ Реальные переводы через Wise
- ✅ Multi-currency operations
- ✅ Transfers to Revolut и другие recipients
- ✅ Full end-to-end flow готов!

## Следующий шаг

После завершения Phase 4 переходим к [Phase 5: End-to-End Integration](phase-5-e2e.md)
