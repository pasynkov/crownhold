# Recipients & Scenarios

## Money Flow Direction

Crown Hold поддерживает **только однонаправленное движение** средств:

```
USDC (Polygon)
   ↓
   ├─> Kraken (deposit)
   └─> Other Wallets (e.g., жена, друг)

Kraken
   ↓
   └─> Wise (withdrawal only, no deposits back)

Wise
   ↓
   └─> Recipients (Revolut, банки, люди)
```

**Нет обратного движения:**
- ❌ Kraken → Polygon (не поддерживается)
- ❌ Wise → Kraken (не поддерживается)
- ❌ Recipients → Wise (отдельный процесс вне системы)

## Recipient Configuration

### Структура Recipients

Все получатели предварительно настроены в `.env` файлах с **aliases** для естественного языка.

### Polygon Recipients (Other Wallets)

```bash
# .env для mcp-polygon

# Primary destinations
KRAKEN_DEPOSIT_ADDRESS=0x1234...abcd
KRAKEN_DEPOSIT_ALIAS=kraken,кракен,exchange,биржа

# Personal wallets
WIFE_WALLET_ADDRESS=0x5678...efgh
WIFE_WALLET_ALIAS=wife,жена,полина,polina

FRIEND_WALLET_ADDRESS=0x9abc...ijkl
FRIEND_WALLET_ALIAS=friend,друг,андрей,andrey

SAVINGS_WALLET_ADDRESS=0xdef0...mnop
SAVINGS_WALLET_ALIAS=savings,сбережения,холодный кошелек,cold wallet
```

### Wise Recipients

```bash
# .env для mcp-wise

# Personal accounts
MY_REVOLUT_RECIPIENT_ID=12345678
MY_REVOLUT_ALIAS=revolut,мой револют,my revolut,себе,myself

WIFE_REVOLUT_RECIPIENT_ID=23456789
WIFE_REVOLUT_ALIAS=wife revolut,револют жены,жена,полина,polina,wife

# Business/Salary
POLINA_SALARY_RECIPIENT_ID=34567890
POLINA_SALARY_ALIAS=polina salary,зарплата полины,зарплата жены,salary

# Other recipients
MOM_BANK_RECIPIENT_ID=45678901
MOM_BANK_ALIAS=mom,мама,mother

SISTER_BANK_RECIPIENT_ID=56789012
SISTER_BANK_ALIAS=sister,сестра
```

### Format

```bash
# Pattern:
{NAME}_RECIPIENT_ID=technical_id
{NAME}_ALIAS=alias1,alias2,alias3,алиас4,алиас5

# Multiple aliases separated by comma
# Can include Russian and English
# Case-insensitive matching
```

## Natural Language Recipient Matching

### How It Works

Claude Desktop инструкции включают логику для matching natural language:

```
User: "отправь 1000 usdc жене"
   ↓
Claude парсит: recipient = "жене"
   ↓
MCP server: находит "жене" в WIFE_WALLET_ALIAS
   ↓
Resolves to: WIFE_WALLET_ADDRESS
   ↓
Executes transfer to 0x5678...efgh
```

### Matching Rules

1. **Case-insensitive**: "Жена", "жена", "ЖЕНА" → same
2. **Partial match**: "жен" может match "жена"
3. **Comma-separated**: любой alias из списка
4. **Multi-language**: Russian + English supported

### Example Queries

**Direct names:**
```
"Send 100 USDC to Polina"
"Отправь 500 usdc Андрею"
"Transfer 1000 to wife"
```

**Contextual references:**
```
"Send money to my Revolut"
"Отправь на мой револют"
"Transfer to myself"
```

**Scenario-based:**
```
"Pay Polina's salary"
"Начисли зарплату Полине"
"Send wife's salary"
```

## Scenarios

Сценарии - это предварительно настроенные recurring payments или стандартные операции.

### Scenario Configuration

```bash
# .env для scenarios (можно в любом из MCP серверов)

# Monthly salary
SCENARIO_POLINA_SALARY_AMOUNT=5000
SCENARIO_POLINA_SALARY_CURRENCY=EUR
SCENARIO_POLINA_SALARY_RECIPIENT=polina salary
SCENARIO_POLINA_SALARY_SOURCE=wise
SCENARIO_POLINA_SALARY_DESCRIPTION=Monthly salary for Polina

# Personal transfer
SCENARIO_WIFE_ALLOWANCE_AMOUNT=1000
SCENARIO_WIFE_ALLOWANCE_CURRENCY=EUR
SCENARIO_WIFE_ALLOWANCE_RECIPIENT=wife revolut
SCENARIO_WIFE_ALLOWANCE_SOURCE=wise
SCENARIO_WIFE_ALLOWANCE_DESCRIPTION=Monthly allowance

# Savings
SCENARIO_MONTHLY_SAVINGS_AMOUNT=2000
SCENARIO_MONTHLY_SAVINGS_CURRENCY=USDC
SCENARIO_MONTHLY_SAVINGS_RECIPIENT=savings
SCENARIO_MONTHLY_SAVINGS_SOURCE=polygon
SCENARIO_MONTHLY_SAVINGS_DESCRIPTION=Monthly savings to cold wallet
```

### Using Scenarios

**Through Claude:**
```
User: "Начисли зарплату Полине"
Claude: [Looks up SCENARIO_POLINA_SALARY_*]
"I'll pay Polina's salary:
- Amount: 5,000 EUR
- From: Wise account
- To: Polina's account
- Description: Monthly salary for Polina

Proceed? (yes/no)"
```

**With natural variations:**
```
"Pay wife's salary" → POLINA_SALARY scenario
"Send monthly allowance" → WIFE_ALLOWANCE scenario
"Move to savings" → MONTHLY_SAVINGS scenario
```

### Scenario Types

#### 1. Salary Payments
```bash
SCENARIO_*_SALARY_*
- Fixed amounts
- Monthly recurrence
- Specific recipients
- Standard description
```

#### 2. Allowances
```bash
SCENARIO_*_ALLOWANCE_*
- Regular personal payments
- Family members
- Flexible timing
```

#### 3. Savings
```bash
SCENARIO_*_SAVINGS_*
- Automated savings transfers
- To cold wallets
- To investment accounts
```

#### 4. Bills
```bash
SCENARIO_*_BILL_*
- Recurring bill payments
- Utilities, rent, etc.
- Fixed amounts
```

## Implementation in MCP Servers

### Polygon MCP: Recipient Resolution

```typescript
// polygon/recipients.service.ts

interface RecipientConfig {
  address: string;
  aliases: string[];
  name: string;
}

@Injectable()
export class RecipientsService {
  private recipients: Map<string, RecipientConfig> = new Map();

  constructor(private config: ConfigService) {
    this.loadRecipients();
  }

  private loadRecipients() {
    // Load all *_ADDRESS and *_ALIAS from .env
    const envVars = this.config.getAllEnvVars();

    for (const [key, value] of Object.entries(envVars)) {
      if (key.endsWith('_ADDRESS')) {
        const name = key.replace('_ADDRESS', '');
        const aliasKey = `${name}_ALIAS`;
        const aliases = envVars[aliasKey]?.split(',').map(a => a.trim().toLowerCase()) || [];

        this.recipients.set(name, {
          address: value,
          aliases,
          name: name.toLowerCase(),
        });
      }
    }
  }

  resolveRecipient(query: string): string | null {
    const normalizedQuery = query.toLowerCase().trim();

    for (const [name, config] of this.recipients.entries()) {
      // Exact name match
      if (config.name === normalizedQuery) {
        return config.address;
      }

      // Alias match
      for (const alias of config.aliases) {
        if (alias === normalizedQuery || alias.includes(normalizedQuery)) {
          return config.address;
        }
      }
    }

    // If starts with 0x, assume it's already an address
    if (normalizedQuery.startsWith('0x')) {
      return normalizedQuery;
    }

    return null;
  }

  getRecipientName(address: string): string | null {
    for (const [name, config] of this.recipients.entries()) {
      if (config.address.toLowerCase() === address.toLowerCase()) {
        return name;
      }
    }
    return null;
  }

  listRecipients(): RecipientConfig[] {
    return Array.from(this.recipients.values());
  }
}
```

### Wise MCP: Scenario Resolution

```typescript
// wise/scenarios.service.ts

interface ScenarioConfig {
  amount: number;
  currency: string;
  recipient: string;
  source: string;
  description: string;
}

@Injectable()
export class ScenariosService {
  private scenarios: Map<string, ScenarioConfig> = new Map();

  constructor(private config: ConfigService) {
    this.loadScenarios();
  }

  private loadScenarios() {
    const envVars = this.config.getAllEnvVars();
    const scenarioNames = new Set<string>();

    // Find all SCENARIO_* prefixes
    for (const key of Object.keys(envVars)) {
      if (key.startsWith('SCENARIO_')) {
        const match = key.match(/^SCENARIO_([A-Z_]+)_/);
        if (match) {
          scenarioNames.add(match[1]);
        }
      }
    }

    // Load each scenario
    for (const name of scenarioNames) {
      const scenario: ScenarioConfig = {
        amount: parseFloat(envVars[`SCENARIO_${name}_AMOUNT`] || '0'),
        currency: envVars[`SCENARIO_${name}_CURRENCY`] || 'EUR',
        recipient: envVars[`SCENARIO_${name}_RECIPIENT`] || '',
        source: envVars[`SCENARIO_${name}_SOURCE`] || '',
        description: envVars[`SCENARIO_${name}_DESCRIPTION`] || '',
      };

      this.scenarios.set(name.toLowerCase(), scenario);
    }
  }

  resolveScenario(query: string): ScenarioConfig | null {
    const normalized = query.toLowerCase().replace(/['\s]/g, '_');

    // Direct match
    if (this.scenarios.has(normalized)) {
      return this.scenarios.get(normalized);
    }

    // Partial match
    for (const [name, config] of this.scenarios.entries()) {
      if (name.includes(normalized) || normalized.includes(name)) {
        return config;
      }

      // Match by description keywords
      if (config.description.toLowerCase().includes(query.toLowerCase())) {
        return config;
      }
    }

    return null;
  }

  listScenarios(): Map<string, ScenarioConfig> {
    return this.scenarios;
  }
}
```

## Claude Desktop Instructions Update

Добавить в [claude-desktop-instructions.md](claude-desktop-instructions.md):

```markdown
## Natural Language Recipients

Users can refer to recipients by natural names:

**Polygon transfers:**
- "Send to wife" → resolves to WIFE_WALLET_ADDRESS
- "Transfer to Polina" → resolves to WIFE_WALLET_ADDRESS
- "Send to Kraken" → resolves to KRAKEN_DEPOSIT_ADDRESS

**Wise transfers:**
- "Transfer to my Revolut" → resolves to MY_REVOLUT_RECIPIENT_ID
- "Send to wife's Revolut" → resolves to WIFE_REVOLUT_RECIPIENT_ID
- "Pay to mom" → resolves to MOM_BANK_RECIPIENT_ID

**When user says natural name:**
1. Pass the name as-is to MCP tool
2. MCP server will resolve to technical ID
3. If resolution fails, MCP returns error with available recipients

**Scenarios:**
- "Pay Polina's salary" → uses POLINA_SALARY scenario
- "Send monthly allowance" → uses configured scenario
- "Transfer savings" → uses SAVINGS scenario

Always confirm with user BEFORE executing:
"I'll send 5,000 EUR to Polina (wife's salary account).
Proceed? (yes/no)"
```

## Example Workflows

### Example 1: Send to Wife

```
User: "Отправь 1000 USDC жене"

Claude:
I'll send 1,000 USDC to your wife's wallet.

Details:
- From: Polygon wallet (0xYour...1234)
- To: Wife's wallet (Polina) - 0x5678...efgh
- Amount: 1,000 USDC
- Gas: ~0.01 USDC

Proceed? (yes/no)

User: yes

Claude:
✓ Transfer initiated
  TX: 0xabc...123

⏳ Waiting for confirmations...
  [2 min later]
✓ Confirmed! 1,000 USDC sent to Polina's wallet.
```

### Example 2: Pay Salary Scenario

```
User: "Начисли зарплату Полине"

Claude:
I'll pay Polina's monthly salary.

Scenario: POLINA_SALARY
- Amount: 5,000 EUR
- From: Wise account
- To: Polina's salary account
- Description: Monthly salary for Polina

Proceed? (yes/no)

User: да

Claude:
✓ Creating transfer in Wise
  Transfer ID: TR-123

⏳ Processing... (this usually takes 1-24 hours)
  [6 hours later, you can check status]
✓ Transfer completed! 5,000 EUR paid to Polina.
```

### Example 3: Complex Flow with Natural Names

```
User: "Переведи 2000 EUR на счет жены через Kraken и Wise"

Claude:
I'll transfer 2,000 EUR to your wife's account. Here's the plan:

1. Calculate USDC needed (~2,174 USDC at 0.92 rate)
2. Transfer USDC from Polygon to Kraken
3. Wait for confirmations (~5 min)
4. Sell USDC for EUR on Kraken (~10 sec)
5. Withdraw EUR to Wise (~1-3 days)
6. Transfer from Wise to Wife's Revolut

Estimated fees: ~10 EUR
Final amount to wife: ~1,990 EUR
Total time: 1-3 days

Proceed? (yes/no)

User: yes

Claude:
[Executes multi-step workflow]
[Each step with status updates]
✓ Complete! 1,990 EUR transferred to Polina's Revolut.
```

## Testing Recipients and Scenarios

### Phase 1A/1B Mock Data

```typescript
// Mock recipients for testing
const MOCK_RECIPIENTS = {
  polygon: {
    'kraken': '0xKRAKEN123...',
    'wife': '0xWIFE456...',
    'жена': '0xWIFE456...',
    'polina': '0xWIFE456...',
    'savings': '0xSAVINGS789...',
  },
  wise: {
    'revolut': '12345678',
    'my revolut': '12345678',
    'wife': '23456789',
    'wife revolut': '23456789',
    'polina': '34567890',
  },
};

// Mock scenarios
const MOCK_SCENARIOS = {
  'polina_salary': {
    amount: 5000,
    currency: 'EUR',
    recipient: 'polina',
    description: 'Monthly salary',
  },
  'wife_allowance': {
    amount: 1000,
    currency: 'EUR',
    recipient: 'wife revolut',
    description: 'Monthly allowance',
  },
};
```

## Security Considerations

### Recipient Validation

```typescript
// Always validate resolved recipient
function validateRecipient(resolved: string, query: string): boolean {
  if (!resolved) {
    throw new Error(`Unknown recipient: ${query}`);
  }

  // For Polygon addresses
  if (resolved.startsWith('0x')) {
    if (!ethers.isAddress(resolved)) {
      throw new Error(`Invalid address: ${resolved}`);
    }
  }

  // Log for audit
  this.logger.log(`Recipient resolved: "${query}" → ${resolved}`);

  return true;
}
```

### Scenario Authorization

```typescript
// Check if scenario amount is within limits
function validateScenario(scenario: ScenarioConfig): boolean {
  const maxAmount = this.config.get(`MAX_TRANSFER_AMOUNT_${scenario.currency}`);

  if (scenario.amount > maxAmount) {
    throw new Error(
      `Scenario amount ${scenario.amount} exceeds limit ${maxAmount}`
    );
  }

  return true;
}
```

## Benefits

✅ **Natural interaction**: "отправь жене" вместо "0x5678...efgh"
✅ **Multi-language**: Russian + English
✅ **Scenarios**: Pre-configured recurring payments
✅ **Safety**: All recipients pre-approved in .env
✅ **Audit**: Every resolution logged
✅ **Flexible**: Multiple aliases per recipient
✅ **Expandable**: Easy to add new recipients/scenarios

## Next Steps

1. **Phase 1A/1B**: Implement recipient resolution in mocks
2. **Phase 2-4**: Use real addresses/IDs with same resolution logic
3. **Phase 5**: Test all natural language variations
4. **Phase 6**: Production recipients with real people/accounts
