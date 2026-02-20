# Phase 0: Research & API Analysis

**Цель:** Изучить API всех сервисов и выбрать технологии для интеграции

**Время:** 1-2 дня

**Статус:** 🔄 In Progress

## Задачи

- [x] Исследовать Kraken API
- [x] Исследовать Wise API
- [x] Выбрать библиотеки для Polygon/USDC
- [ ] Создать API Research документ
- [ ] Определить список endpoints для каждого сервиса
- [ ] Проверить доступность sandbox/testnet

## 1. Kraken API

### Официальная документация
- **Основной сайт:** https://docs.kraken.com/rest/
- **API Version:** REST API v2 (2024+)
- **Base URL:** `https://api.kraken.com`
- **Authentication:** API Key + API Secret (HMAC SHA512)

### Ключевые Endpoints

#### Account & Balance
```
GET /0/private/Balance
  - Получить балансы всех валют
  - Requires: API-Key, API-Sign, nonce
```

#### Market Data
```
GET /0/public/Ticker
  - Получить цены пар
  - Parameters: pair (e.g., USDCEUR, USDCUSD)
  - Public endpoint (no auth)

GET /0/public/OHLC
  - Исторические данные
```

#### Deposits
```
POST /0/private/DepositMethods
  - Получить методы депозита для актива
  - Returns: method names, limits, fees

POST /0/private/DepositAddresses
  - Получить адрес для депозита крипты
  - Parameters: asset, method
  - Returns: address (для Polygon - polygon адрес)

GET /0/private/DepositStatus
  - Проверить статус депозита
  - Parameters: asset, method
  - Returns: list of deposits with status
```

#### Trading
```
POST /0/private/AddOrder
  - Создать ордер (buy/sell)
  - Parameters:
    - pair: торговая пара (USDCEUR)
    - type: buy или sell
    - ordertype: market, limit, stop-loss, etc.
    - volume: количество
    - price: цена (для limit orders)
  - Returns: txid (order ID)

POST /0/private/QueryOrders
  - Проверить статус ордеров
  - Parameters: txid
  - Returns: order details, status, fills

GET /0/private/OpenOrders
  - Список открытых ордеров

GET /0/private/ClosedOrders
  - История закрытых ордеров
```

#### Withdrawals
```
POST /0/private/WithdrawFunds
  - Вывести средства
  - Parameters:
    - asset: валюта (EUR, USDC)
    - key: имя предварительно установленного метода вывода
    - amount: сумма
  - Returns: refid (withdrawal ID)

POST /0/private/WithdrawStatus
  - Проверить статус вывода
  - Parameters: asset, method
  - Returns: list of withdrawals with status

POST /0/private/WithdrawCancel
  - Отменить вывод (если еще не обработан)
```

### Rate Limits
- **Public API:** 1 request/second
- **Private API:** 15-20 requests/minute (tier-based)
- **Burst:** Allowed short bursts

### Node.js Libraries
```bash
npm install kraken-api
# или
npm install ccxt  # Универсальная библиотека для exchanges
```

**Рекомендация:** `kraken-api` - официально поддерживаемая, простая в использовании

### Пример использования
```typescript
import KrakenClient from 'kraken-api';

const kraken = new KrakenClient(
  process.env.KRAKEN_API_KEY,
  process.env.KRAKEN_API_SECRET
);

// Get balance
const balance = await kraken.api('Balance');

// Get ticker
const ticker = await kraken.api('Ticker', { pair: 'USDCEUR' });

// Create market order
const order = await kraken.api('AddOrder', {
  pair: 'USDCEUR',
  type: 'sell',
  ordertype: 'market',
  volume: '1000'
});

// Check order status
const orderStatus = await kraken.api('QueryOrders', {
  txid: order.result.txid[0]
});
```

### Sandbox/Testing
- **Sandbox:** Kraken не предоставляет публичный sandbox
- **Testing:** Использовать маленькие суммы на real API
- **Alternative:** Создать mock сервис для разработки

### Важные особенности

1. **Предварительная настройка withdrawal keys**
   - Нужно заранее добавить withdrawal methods в UI
   - API может только использовать существующие methods
   - Для Wise: добавить как Bank Transfer

2. **Nonce requirements**
   - Каждый запрос требует уникальный nonce (timestamp)
   - Должен быть больше предыдущего

3. **Asset naming**
   - USDC может называться `USDC` или `ZUSD` в зависимости от контекста
   - EUR = `ZEUR` (Z prefix для fiat)

4. **Deposit confirmation times**
   - Polygon: ~30-50 confirmations (3-10 минут)
   - После подтверждения еще 2-5 минут на кредитование

## 2. Wise API

### Официальная документация
- **Основной сайт:** https://docs.wise.com/api-docs/
- **API Version:** v1, v3 (endpoints vary)
- **Base URL:** `https://api.wise.com` (production)
- **Sandbox URL:** `https://api.sandbox.transferwise.tech`
- **Authentication:** Bearer Token (Personal Access Token or OAuth2)

### Ключевые Endpoints

#### Authentication
```
POST /oauth/token
  - OAuth2 token (для приложений)
  - Для personal use: создать Personal Access Token в UI
```

#### Profiles
```
GET /v1/profiles
  - Получить список профилей
  - Returns: personal and business profiles
  - Нужен profileId для других операций
```

#### Balance
```
GET /v4/profiles/{profileId}/balances?types=STANDARD
  - Получить балансы всех валют
  - Returns: array of balances (EUR, USD, GBP, etc.)
  - Each balance: amount, currency, available
```

#### Exchange Rates
```
GET /v1/rates?source={currency}&target={currency}
  - Получить курс обмена
  - Parameters: source (EUR), target (USD)
  - Returns: rate, timestamp
```

#### Recipients (Beneficiaries)
```
GET /v1/accounts?profile={profileId}
  - Список получателей
  - Returns: array of recipient accounts

POST /v1/accounts
  - Добавить получателя (но лучше через UI)
  - Parameters: currency, type, details
```

#### Quotes
```
POST /v3/profiles/{profileId}/quotes
  - Создать quote (расчет перевода)
  - Parameters:
    - sourceCurrency: EUR
    - targetCurrency: EUR (для same currency)
    - sourceAmount: 1000
    - targetAccount: recipient ID
  - Returns: quote ID, fee, rate, delivery estimate

GET /v3/profiles/{profileId}/quotes/{quoteId}
  - Получить детали quote
```

#### Transfers
```
POST /v1/transfers
  - Создать перевод
  - Parameters:
    - targetAccount: recipient ID
    - quoteUuid: quote ID
    - customerTransactionId: unique ID
    - details: { reference }
  - Returns: transfer ID, status

GET /v1/transfers/{transferId}
  - Получить статус перевода
  - Returns: status, timeline

POST /v3/profiles/{profileId}/transfers/{transferId}/payments
  - Оплатить перевод из balance
  - Parameters: { type: "BALANCE" }
  - Executes the transfer
```

#### Transfer Status Timeline
```
Statuses (in order):
- incoming_payment_waiting
- processing
- funds_converted (if currency exchange)
- outgoing_payment_sent
- bounced_back (error)
- funds_refunded (error)
- completed
```

### Rate Limits
- **Production:** ~60 requests/minute
- **Sandbox:** Более мягкие лимиты

### Node.js Libraries
```bash
# Официального SDK нет, используем axios
npm install axios
```

**Рекомендация:** Использовать `axios` напрямую с Wise API

### Пример использования
```typescript
import axios from 'axios';

const wise = axios.create({
  baseURL: 'https://api.wise.com',
  headers: {
    'Authorization': `Bearer ${process.env.WISE_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Get profile
const profiles = await wise.get('/v1/profiles');
const profileId = profiles.data[0].id;

// Get balances
const balances = await wise.get(`/v4/profiles/${profileId}/balances`, {
  params: { types: 'STANDARD' }
});

// Create quote
const quote = await wise.post(`/v3/profiles/${profileId}/quotes`, {
  sourceCurrency: 'EUR',
  targetCurrency: 'EUR',
  sourceAmount: 1000,
  targetAccount: recipientId
});

// Create transfer
const transfer = await wise.post('/v1/transfers', {
  targetAccount: recipientId,
  quoteUuid: quote.data.id,
  customerTransactionId: uuidv4(),
  details: {
    reference: 'Crown Hold transfer'
  }
});

// Fund transfer from balance
await wise.post(
  `/v3/profiles/${profileId}/transfers/${transfer.data.id}/payments`,
  { type: 'BALANCE' }
);

// Check status
const status = await wise.get(`/v1/transfers/${transfer.data.id}`);
```

### Sandbox/Testing
- **Sandbox:** ✅ Доступен!
- **URL:** `https://api.sandbox.transferwise.tech`
- **Credentials:** Отдельные для sandbox
- **Test data:** Можно создавать тестовые переводы

### Важные особенности

1. **Recipients должны быть предварительно добавлены**
   - Добавить через Wise UI или API
   - Требуется верификация

2. **Quotes expire**
   - Quote действителен ~30 минут
   - Нужно создать transfer до истечения

3. **Balance transfers**
   - Можно платить из Wise баланса (type: BALANCE)
   - Или через bank transfer (не нужно для нас)

4. **Delivery estimates**
   - API возвращает примерное время доставки
   - Usually 1-24 hours для EUR transfers

## 3. Polygon & USDC

### Сеть
- **Network:** Polygon PoS (Matic)
- **Chain ID:** 137 (mainnet), 80001 (Mumbai testnet)
- **RPC URL (public):**
  - Mainnet: `https://polygon-rpc.com`
  - Mumbai: `https://rpc-mumbai.maticvigil.com`
- **Block Explorer:** https://polygonscan.com

### USDC Contract
- **Mainnet Address:** `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Mumbai Testnet:** `0x0FA8781a83E46826621b3BC094Ea2A0212e71B23`
- **Decimals:** 6
- **Token Standard:** ERC-20

### Рекомендуемая библиотека: ethers.js v6

```bash
npm install ethers@^6
```

**Почему ethers.js:**
- ✅ Наиболее популярная (>2M downloads/week)
- ✅ Отличная документация
- ✅ TypeScript support из коробки
- ✅ Поддержка всех EVM chains
- ✅ Активно поддерживается
- ✅ Простой API

**Альтернативы:**
- `web3.js` - старая, более сложная
- `viem` - новая, современная, но менее распространенная

### Пример использования
```typescript
import { ethers } from 'ethers';

// Connect to Polygon
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

// Create wallet
const wallet = new ethers.Wallet(
  process.env.WALLET_PRIVATE_KEY,
  provider
);

// USDC Contract
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

// Get balance
const balance = await usdc.balanceOf(wallet.address);
const balanceFormatted = ethers.formatUnits(balance, 6); // USDC has 6 decimals

// Transfer USDC
const amount = ethers.parseUnits('100', 6); // 100 USDC
const tx = await usdc.transfer(recipientAddress, amount);
await tx.wait(); // Wait for confirmation

// Get transaction status
const receipt = await provider.getTransactionReceipt(tx.hash);
console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
console.log(`Confirmations: ${await tx.confirmations()}`);
```

### Gas на Polygon
```typescript
// Check MATIC balance for gas
const maticBalance = await provider.getBalance(wallet.address);

// Estimate gas for transfer
const gasEstimate = await usdc.transfer.estimateGas(
  recipientAddress,
  amount
);

// Send with gas settings
const tx = await usdc.transfer(recipientAddress, amount, {
  gasLimit: gasEstimate * 120n / 100n, // +20% buffer
  maxFeePerGas: ethers.parseUnits('50', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
});
```

### Testnet (Mumbai)
```typescript
// Mumbai RPC
const provider = new ethers.JsonRpcProvider(
  'https://rpc-mumbai.maticvigil.com'
);

// Mumbai USDC
const USDC_MUMBAI = '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23';

// Get test MATIC from faucet:
// https://faucet.polygon.technology/

// Get test USDC:
// https://faucet.circle.com/ (для тестовых сетей)
```

### Важные особенности

1. **MATIC для gas**
   - Всегда нужен MATIC для оплаты gas
   - ~0.001-0.01 MATIC на транзакцию
   - Держать минимум 0.1 MATIC на кошельке

2. **Confirmations**
   - Считается confirmed после 12+ блоков
   - На Polygon ~2-3 минуты

3. **RPC endpoints**
   - Public endpoints могут быть медленными
   - Для продакшена лучше использовать:
     - Alchemy: `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY`
     - Infura: `https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID`
     - QuickNode, Ankr и др.

## Итоговые рекомендации

### Выбранные технологии

| Сервис | Библиотека | Версия | Sandbox |
|--------|-----------|--------|---------|
| Polygon | ethers | ^6.0.0 | ✅ Mumbai testnet |
| Kraken | kraken-api | latest | ❌ Real API only |
| Wise | axios | latest | ✅ Sandbox available |

### Установка зависенностей

```bash
# Для всех MCP серверов
npm install ethers@^6 kraken-api axios dotenv

# Dev dependencies
npm install -D @types/node typescript
```

### Порядок интеграции

1. **Phase 1:** Mock сервисы (эмуляция)
2. **Phase 2:** Polygon Mumbai testnet
3. **Phase 3:** Wise Sandbox
4. **Phase 4:** Kraken Real API (с малыми суммами)
5. **Phase 5:** Polygon Mainnet
6. **Phase 6:** Wise Production

### API Credentials Setup

#### Kraken
1. Login to Kraken
2. Settings → API → Generate New Key
3. Permissions:
   - ✅ Query Funds
   - ✅ Query Open/Closed Orders
   - ✅ Create & Modify Orders
   - ✅ Deposit Funds
   - ✅ Withdraw Funds
4. Copy Key & Secret to `.env`

#### Wise
1. Login to Wise
2. Settings → API tokens → Create token
3. Permissions:
   - ✅ Read balances
   - ✅ Create transfers
   - ✅ View recipients
4. Copy token to `.env`
5. For sandbox: Register at https://sandbox.transferwise.tech

#### Polygon
1. Create new wallet or export existing
2. Fund with MATIC (for gas)
3. Add USDC
4. Save private key to `.env` (NEVER commit!)

## Следующий шаг

✅ Research завершен

Переходим к [Phase 1: MCP Infrastructure + Mock Services](phase-1-mcp-mocks.md)
