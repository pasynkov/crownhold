# Phase 1B: Full Mock Services

**Цель:** Создать полноценные mock сервисы для всех трех платформ с реалистичным поведением

**Время:** 3-4 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 1A завершена (минимальный mock работает с Claude Desktop)

## Зачем полные моки?

После Phase 1A мы знаем что **базовая интеграция работает**. Теперь нужно:

1. **Эмулировать все операции** - transfers, trades, withdrawals
2. **Реалистичное async поведение** - confirmations, delays, status changes
3. **Тестирование сложных workflows** - multi-step операции
4. **Отладка error handling** - что если balance insufficient?
5. **Проверка user experience** - понятны ли статусы? хорошо ли Claude общается?

После этой фазы можно будет протестировать **весь flow end-to-end** без риска.

## Задачи

### 1.1 Базовая структура NestJS приложений

- [ ] Инициализировать NestJS приложения для каждого MCP сервера
- [ ] Настроить TypeScript конфигурацию
- [ ] Настроить структуру модулей
- [ ] Настроить логирование (winston)
- [ ] Создать базовые .env.example файлы

**Результат:** Три пустых NestJS приложения готовых к разработке

### 1.2 MCP Protocol Implementation

- [ ] Изучить MCP SDK (@modelcontextprotocol/sdk)
- [ ] Реализовать stdio transport для каждого сервера
- [ ] Реализовать базовый MCP server lifecycle
- [ ] Добавить error handling для MCP messages
- [ ] Тестировать подключение через Claude Desktop

**Результат:** Claude Desktop может подключаться к MCP серверам

### 1.3 Mock Polygon Service

- [ ] Создать PolygonMockService с in-memory state
- [ ] Реализовать tools:
  - `polygon_get_balance` - возвращает mock баланс
  - `polygon_get_token_price` - возвращает ~0.92 EUR/USDC
  - `polygon_transfer_usdc` - эмулирует transfer с delay
  - `polygon_get_transaction_status` - эмулирует confirmations
  - `polygon_get_transactions` - возвращает mock историю
  - `polygon_estimate_gas` - возвращает mock оценку
- [ ] Эмулировать временные задержки (2-5 мин для confirmations)
- [ ] Добавить mock transaction hashes
- [ ] Логировать все операции

**Результат:** Полностью работающий Polygon MCP с эмуляцией

### 1.4 Mock Kraken Service

- [ ] Создать KrakenMockService с in-memory state
- [ ] Реализовать tools:
  - `kraken_get_balances` - возвращает mock балансы
  - `kraken_get_ticker` - возвращает mock цены
  - `kraken_deposit_address` - возвращает fake адрес
  - `kraken_check_deposit` - эмулирует проверку депозита с delay
  - `kraken_create_order` - эмулирует создание ордера
  - `kraken_get_order_status` - эмулирует статусы ордера
  - `kraken_withdraw_fiat` - эмулирует вывод
  - `kraken_get_withdrawal_status` - эмулирует статусы вывода
- [ ] Эмулировать временные задержки (3-10 мин для депозитов)
- [ ] Симулировать увеличение/уменьшение балансов
- [ ] Логировать все операции

**Результат:** Полностью работающий Kraken MCP с эмуляцией

### 1.5 Mock Wise Service

- [ ] Создать WiseMockService с in-memory state
- [ ] Реализовать tools:
  - `wise_get_balances` - возвращает mock балансы
  - `wise_get_rate` - возвращает mock курсы
  - `wise_create_transfer` - эмулирует создание перевода
  - `wise_get_transfer_status` - эмулирует статусы с timeline
  - `wise_get_recipients` - возвращает mock получателей
- [ ] Эмулировать временные задержки (часы для банковских переводов)
- [ ] Симулировать status timeline (processing → completed)
- [ ] Логировать все операции

**Результат:** Полностью работающий Wise MCP с эмуляцией

### 1.6 Асинхронные операции и State Management

- [ ] Реализовать in-memory хранилище для транзакций
- [ ] Реализовать симуляцию времени (ускоренная или реальная)
- [ ] Добавить прогрессивные статусы для всех операций
- [ ] Реализовать timeout механизмы
- [ ] Тестировать polling patterns

**Результат:** Realistic асинхронное поведение как в real API

### 1.7 Integration Testing

- [ ] Написать тесты для каждого MCP tool
- [ ] Протестировать полный workflow через Claude Desktop:
  - Проверка балансов
  - Простой transfer
  - Комплексный workflow (Top up Revolut)
- [ ] Проверить error handling
- [ ] Проверить logging

**Результат:** Все тесты проходят, workflow работает end-to-end

## Архитектура приложений

### Структура каждого MCP сервера

```
applications/mcp-{service}/
├── src/
│   ├── main.ts                    # Entry point, MCP server setup
│   ├── app.module.ts              # Root module
│   ├── mcp/
│   │   ├── mcp.module.ts          # MCP protocol module
│   │   ├── mcp.service.ts         # MCP server lifecycle
│   │   └── stdio-transport.ts    # stdio communication
│   ├── {service}/
│   │   ├── {service}.module.ts   # Service module
│   │   ├── {service}.service.ts  # Business logic
│   │   ├── mock.service.ts       # Mock implementation
│   │   └── {service}.types.ts    # TypeScript types
│   ├── config/
│   │   └── configuration.ts      # Config management
│   └── common/
│       ├── logger.service.ts     # Winston logger
│       └── utils.ts              # Helpers
├── test/
│   ├── unit/
│   └── integration/
├── .env.example
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### MCP Server Structure

```typescript
// main.ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

async function main() {
  const server = new Server(
    {
      name: 'crown-polygon',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'polygon_get_balance',
        description: 'Get USDC and MATIC balance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ... more tools
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Handle tool calls
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'polygon_get_balance':
        return await handleGetBalance(args);
      // ... more handlers
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

### Mock Service Example

```typescript
// polygon/mock.service.ts
@Injectable()
export class PolygonMockService {
  private state = {
    balance: {
      usdc: '5234.50',
      matic: '12.45',
    },
    transactions: new Map<string, MockTransaction>(),
  };

  async getBalance(): Promise<BalanceResult> {
    this.logger.log('Mock: Getting balance');

    return {
      success: true,
      data: {
        address: '0xMOCK1234567890abcdef',
        usdc: this.state.balance.usdc,
        matic: this.state.balance.matic,
      },
    };
  }

  async transferUSDC(
    recipient: string,
    amount: number
  ): Promise<TransferResult> {
    this.logger.log(`Mock: Transferring ${amount} USDC to ${recipient}`);

    // Generate mock tx hash
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');

    // Create mock transaction
    const tx: MockTransaction = {
      hash: txHash,
      status: 'pending',
      confirmations: 0,
      timestamp: new Date(),
    };

    this.state.transactions.set(txHash, tx);

    // Simulate blockchain processing
    this.simulateConfirmations(txHash);

    // Update balance
    this.state.balance.usdc = (
      parseFloat(this.state.balance.usdc) - amount
    ).toString();

    return {
      success: true,
      data: {
        transactionHash: txHash,
        from: '0xMOCK1234567890abcdef',
        to: recipient,
        amount: amount.toString(),
        status: 'pending',
      },
    };
  }

  async getTransactionStatus(txHash: string): Promise<StatusResult> {
    const tx = this.state.transactions.get(txHash);

    if (!tx) {
      return {
        success: false,
        error: {
          code: 'TX_NOT_FOUND',
          message: 'Transaction not found',
        },
      };
    }

    return {
      success: true,
      data: {
        transactionHash: txHash,
        status: tx.status,
        confirmations: tx.confirmations,
        blockNumber: tx.blockNumber,
      },
    };
  }

  private async simulateConfirmations(txHash: string) {
    // Simulate block confirmations over time
    const tx = this.state.transactions.get(txHash);
    if (!tx) return;

    // Each confirmation ~2 seconds (faster than real Polygon)
    for (let i = 1; i <= 12; i++) {
      await this.sleep(2000);
      tx.confirmations = i;

      if (i === 1) {
        tx.status = 'confirming';
        tx.blockNumber = Math.floor(Math.random() * 1000000) + 40000000;
      }

      if (i >= 12) {
        tx.status = 'confirmed';
      }

      this.logger.log(`Mock: TX ${txHash.slice(0, 10)}... ${i}/12 confirmations`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Детальные спецификации Mock сервисов

### Polygon Mock Behavior

```typescript
// Балансы
Initial:
  USDC: 5,234.50
  MATIC: 12.45

// Transfer simulation
- Pending: 0 seconds
- Confirming: 2-24 seconds (1-12 blocks)
- Confirmed: 24+ seconds (12+ blocks)
- Gas cost: ~0.01 MATIC per transfer

// Transaction status progression
pending (0 confirmations)
  ↓ 2 sec
confirming (1 confirmation)
  ↓ 2 sec each
confirming (2-11 confirmations)
  ↓ 2 sec
confirmed (12+ confirmations)
```

### Kraken Mock Behavior

```typescript
// Балансы
Initial:
  EUR: 2,150.30
  USDC: 208.73
  BTC: 0.0023

// Ticker prices
USDCEUR: 0.9200 ± 0.001 (slight fluctuation)
USDCUSD: 1.0000 ± 0.0001

// Deposit simulation
1. check_deposit returns credited=false
2. After 3 minutes → credited=true
3. Balance увеличивается

// Order execution
1. Order created (status: pending)
2. After 5-10 seconds → status: closed
3. Balances update accordingly

// Withdrawal simulation
1. Withdrawal created (status: pending)
2. After 30 seconds → status: processing
3. After 2 minutes → status: success
4. Balance уменьшается
```

### Wise Mock Behavior

```typescript
// Балансы
Initial:
  EUR: 1,500.00
  GBP: 800.00
  USD: 250.00

// Recipients
Mock recipients:
  - revolut (EUR)
  - uk-account (GBP)

// Transfer simulation
Status timeline (30 sec intervals):
1. processing (0 min)
2. funds_converted (0.5 min, if currency exchange)
3. outgoing_payment_sent (1 min)
4. completed (2 min)

Real bank transfers take hours, but for testing we speed up.

// Exchange rates
EUR/USD: 1.09
EUR/GBP: 0.86
GBP/USD: 1.27
```

## Конфигурация

### .env.example (для Mock режима)

```bash
# Environment
NODE_ENV=development

# Mock mode
ENABLE_MOCK=true

# Mock timing (seconds)
MOCK_POLYGON_CONFIRMATION_TIME=2
MOCK_KRAKEN_DEPOSIT_TIME=180
MOCK_KRAKEN_ORDER_TIME=8
MOCK_WISE_TRANSFER_TIME=120

# Logging
LOG_LEVEL=debug
LOG_FILE=/tmp/crown-polygon-mock.log

# Mock initial balances (optional)
MOCK_POLYGON_USDC=5234.50
MOCK_POLYGON_MATIC=12.45
MOCK_KRAKEN_EUR=2150.30
MOCK_KRAKEN_USDC=208.73
MOCK_WISE_EUR=1500.00
```

## Testing Workflow

### Test 1: Simple Balance Check

```
User: What's my USDC balance on Polygon?

Expected:
Claude: Your Polygon wallet has 5,234.50 USDC and 12.45 MATIC
```

### Test 2: Simple Transfer

```
User: Transfer 100 USDC to Kraken

Expected:
Claude:
- Transferring 100 USDC to Kraken...
- TX: 0xabc123...
- Status: Pending...
[2 sec] Confirming (3/12)
[4 sec] Confirming (6/12)
[6 sec] Confirming (10/12)
[8 sec] Confirmed! (12/12)
- Your new balance: 5,134.50 USDC
```

### Test 3: Complex Workflow (Top up Revolut)

```
User: Top up my Revolut with 100 EUR

Expected:
Claude executes full workflow:
1. Check Polygon balance ✓
2. Get USDC/EUR rate ✓
3. Transfer 109 USDC to Kraken
   [wait 24 sec for confirmations]
4. Wait for Kraken deposit
   [wait 3 min for crediting]
5. Sell USDC for EUR
   [wait 8 sec for fill]
6. Withdraw EUR to Wise
   [wait 2 min for processing]
7. Transfer EUR to Revolut
   [wait 2 min for completion]

Total time: ~7 minutes (mock)
Result: Mock transfer completed successfully
```

## Критерии завершения Phase 1

Фаза считается завершенной когда:

- ✅ Все три MCP сервера запускаются через Claude Desktop
- ✅ Claude Desktop видит все tools
- ✅ Можно выполнить простые запросы (балансы, цены)
- ✅ Можно выполнить simple transfer с ожиданием confirmations
- ✅ Можно выполнить complex workflow end-to-end
- ✅ Все операции логируются
- ✅ Mock timing реалистичен (можно ускорить для тестов)
- ✅ Error handling работает корректно

## Результат Phase 1

**Deliverables:**
1. Три полностью работающих MCP сервера с mock режимом
2. Конфигурация Claude Desktop
3. Документированные workflows
4. Unit и integration тесты
5. Детальные логи всех операций

**Что можно сделать:**
- ✅ Протестировать любой workflow без риска
- ✅ Отладить Claude prompting и tool calls
- ✅ Проверить async operations и polling
- ✅ Убедиться что архитектура работает
- ✅ Найти и исправить проблемы до интеграции real API

## Следующий шаг

После завершения Phase 1B переходим к [Phase 2: Polygon Integration](phase-2-polygon.md)

---

**Note:** Phase 1A + 1B = полная имплементация mock сервисов с проверенной интеграцией Claude Desktop.
