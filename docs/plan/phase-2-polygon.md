# Phase 2: Polygon Integration

**Цель:** Заменить Polygon mock на реальную интеграцию с Mumbai testnet

**Время:** 2-3 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 1 завершена

## Задачи

### 2.1 Polygon Real Service Implementation

- [ ] Установить ethers.js v6
- [ ] Создать PolygonRealService
- [ ] Реализовать подключение к Mumbai testnet RPC
- [ ] Настроить wallet из private key
- [ ] Реализовать USDC contract interaction

### 2.2 Implement Real Tools

- [ ] `polygon_get_balance` - real blockchain query
- [ ] `polygon_get_token_price` - интеграция с DEX или price oracle
- [ ] `polygon_transfer_usdc` - реальные transfers на testnet
- [ ] `polygon_get_transaction_status` - реальные confirmations
- [ ] `polygon_get_transactions` - query blockchain explorer API
- [ ] `polygon_estimate_gas` - real gas estimation

### 2.3 Testnet Setup

- [ ] Создать testnet wallet
- [ ] Получить test MATIC с faucet
- [ ] Получить test USDC с faucet
- [ ] Добавить Kraken deposit address (or mock для тестов)
- [ ] Настроить .env с testnet credentials

### 2.4 Mode Switching

- [ ] Добавить переключатель ENABLE_MOCK в config
- [ ] Реализовать фабрику для выбора Mock/Real service
- [ ] Оставить mock mode для тестов

```typescript
@Module({
  providers: [
    {
      provide: 'POLYGON_SERVICE',
      useFactory: (config: ConfigService) => {
        return config.get('ENABLE_MOCK')
          ? new PolygonMockService()
          : new PolygonRealService();
      },
      inject: [ConfigService],
    },
  ],
})
export class PolygonModule {}
```

### 2.5 Testing

- [ ] Тест: Проверка баланса на testnet
- [ ] Тест: Transfer малой суммы (0.1 USDC)
- [ ] Тест: Ожидание confirmations
- [ ] Тест: Transaction status tracking
- [ ] Тест: Error handling (insufficient balance, gas)
- [ ] Тест через Claude Desktop: полный workflow

## Configuration

### .env для Polygon Testnet

```bash
NODE_ENV=development

# Polygon Configuration
ENABLE_MOCK=false
POLYGON_NETWORK=mumbai
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_CHAIN_ID=80001

# Wallet (testnet)
WALLET_PRIVATE_KEY=0x...your-testnet-key
WALLET_ADDRESS=0x...your-address

# USDC Contract (Mumbai)
USDC_CONTRACT_ADDRESS=0x0FA8781a83E46826621b3BC094Ea2A0212e71B23
USDC_DECIMALS=6

# Recipients
KRAKEN_DEPOSIT_ADDRESS=0x...kraken-or-test-address

# Limits (testnet - more relaxed)
MAX_TRANSFER_AMOUNT_USDC=100

# Gas settings
GAS_LIMIT_MULTIPLIER=1.2
MAX_GAS_PRICE_GWEI=50

# Logging
LOG_LEVEL=debug
LOG_FILE=/tmp/crown-polygon-testnet.log
```

## Implementation Example

```typescript
// polygon/real.service.ts
import { ethers } from 'ethers';

@Injectable()
export class PolygonRealService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private usdcContract: ethers.Contract;

  constructor(private config: ConfigService) {
    this.initializeProvider();
    this.initializeWallet();
    this.initializeContracts();
  }

  private initializeProvider() {
    this.provider = new ethers.JsonRpcProvider(
      this.config.get('POLYGON_RPC_URL')
    );
  }

  private initializeWallet() {
    this.wallet = new ethers.Wallet(
      this.config.get('WALLET_PRIVATE_KEY'),
      this.provider
    );
  }

  private initializeContracts() {
    const USDC_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
    ];

    this.usdcContract = new ethers.Contract(
      this.config.get('USDC_CONTRACT_ADDRESS'),
      USDC_ABI,
      this.wallet
    );
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      // Get MATIC balance
      const maticBalance = await this.provider.getBalance(
        this.wallet.address
      );

      // Get USDC balance
      const usdcBalance = await this.usdcContract.balanceOf(
        this.wallet.address
      );

      return {
        success: true,
        data: {
          address: this.wallet.address,
          usdc: ethers.formatUnits(usdcBalance, 6),
          matic: ethers.formatEther(maticBalance),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get balance', error);
      return {
        success: false,
        error: {
          code: 'BALANCE_ERROR',
          message: error.message,
        },
      };
    }
  }

  async transferUSDC(
    recipient: string,
    amount: number
  ): Promise<TransferResult> {
    try {
      // Validate
      this.validateRecipient(recipient);
      this.validateAmount(amount);

      // Check balance
      const balance = await this.getBalance();
      if (parseFloat(balance.data.usdc) < amount) {
        throw new Error('Insufficient balance');
      }

      // Prepare transaction
      const amountInUnits = ethers.parseUnits(amount.toString(), 6);

      // Estimate gas
      const gasEstimate = await this.usdcContract.transfer.estimateGas(
        recipient,
        amountInUnits
      );

      // Send transaction
      const tx = await this.usdcContract.transfer(
        recipient,
        amountInUnits,
        {
          gasLimit: (gasEstimate * 120n) / 100n, // +20% buffer
        }
      );

      this.logger.log(`Transfer initiated: ${tx.hash}`);

      return {
        success: true,
        data: {
          transactionHash: tx.hash,
          from: this.wallet.address,
          to: recipient,
          amount: amount.toString(),
          status: 'pending',
        },
      };
    } catch (error) {
      this.logger.error('Transfer failed', error);
      return {
        success: false,
        error: {
          code: 'TRANSFER_ERROR',
          message: error.message,
        },
      };
    }
  }

  async getTransactionStatus(txHash: string): Promise<StatusResult> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return {
          success: true,
          data: {
            transactionHash: txHash,
            status: 'pending',
            confirmations: 0,
          },
        };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      let status: string;
      if (receipt.status === 0) {
        status = 'failed';
      } else if (confirmations < 12) {
        status = 'confirming';
      } else {
        status = 'confirmed';
      }

      return {
        success: true,
        data: {
          transactionHash: txHash,
          status,
          confirmations,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get transaction status', error);
      return {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: error.message,
        },
      };
    }
  }
}
```

## Testing Checklist

### Manual Testing

```bash
# 1. Start MCP server in real mode
NODE_ENV=development ENABLE_MOCK=false npm start

# 2. Open Claude Desktop

# 3. Test commands:
"What's my Polygon testnet balance?"
"Transfer 0.1 USDC to 0x..."
"Check status of transaction 0x..."
```

### Expected Results

```
Balance Query:
✓ Returns real balance from Mumbai testnet
✓ Shows actual USDC and MATIC amounts

Transfer:
✓ Creates real blockchain transaction
✓ Returns real transaction hash
✓ Deducts from actual balance
✓ Can verify on https://mumbai.polygonscan.com

Status Check:
✓ Shows real confirmation count
✓ Updates as blocks are mined
✓ Reaches "confirmed" after 12+ blocks
```

## Common Issues & Solutions

### Issue: Insufficient MATIC for gas

**Solution:**
```
Get test MATIC from faucet:
https://faucet.polygon.technology/
Select Mumbai, enter address, request tokens
```

### Issue: No test USDC

**Solution:**
```
Option 1: Circle faucet (if available)
Option 2: Use mock USDC recipient address for testing
Option 3: Deploy your own test ERC20 token
```

### Issue: RPC rate limits

**Solution:**
```
Use alternative RPC:
- Alchemy: https://polygon-mumbai.g.alchemy.com/v2/YOUR-KEY
- Infura: https://polygon-mumbai.infura.io/v3/YOUR-KEY
```

## Критерии завершения Phase 2

- ✅ Polygon Real Service полностью реализован
- ✅ Все tools работают с реальным blockchain
- ✅ Можно переключаться между mock и real режимами
- ✅ Протестирован transfer на testnet
- ✅ Confirmations tracking работает корректно
- ✅ Логи детально записывают все операции
- ✅ Error handling обрабатывает blockchain errors

## Результат Phase 2

**Deliverables:**
- Работающая интеграция с Polygon Mumbai testnet
- Реальные blockchain транзакции
- Переключение mock/real режимов
- Обновленная документация

**Что можно сделать:**
- ✅ Проводить реальные USDC transfers на testnet
- ✅ Тестировать весь blockchain flow
- ✅ Верифицировать транзакции в explorer
- ✅ Подготовиться к mainnet интеграции

## Следующий шаг

После завершения Phase 2 переходим к [Phase 3: Kraken Integration](phase-3-kraken.md)
