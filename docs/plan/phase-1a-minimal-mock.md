# Phase 1A: Minimal Mock для тестирования Claude Desktop интеграции

**Цель:** Создать простейший MCP сервер для проверки интеграции с Claude Desktop

**Время:** 1-2 дня

**Статус:** ⏳ Not Started

**Prerequisite:** Phase 0 завершена

## Зачем отдельная Phase 1A?

Перед разработкой полноценной системы нужно **убедиться что Claude Desktop вообще работает с MCP**:
- Видит ли Claude наши tools?
- Может ли вызывать их?
- Правильно ли передаются параметры?
- Работает ли stdio communication?
- Понимает ли Claude инструкции?

**Лучше выяснить это за 1 день, чем после 5 дней разработки!**

## Задачи

### 1.1 Минимальный MCP сервер (Polygon)

Создадим ОДИН простейший MCP сервер с одним tool.

#### Установка MCP SDK

```bash
cd applications/mcp-polygon
npm init -y
npm install @modelcontextprotocol/sdk
npm install typescript @types/node ts-node --save-dev

# TypeScript config
npx tsc --init
```

#### Создать src/main.ts

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Минимальный MCP сервер
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

// Регистрируем список tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'polygon_get_balance',
        description: 'Get USDC and MATIC balance from Polygon wallet',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Обработка вызовов tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'polygon_get_balance') {
    // Mock данные
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

  throw new Error(`Unknown tool: ${name}`);
});

// Запуск сервера
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Crown Hold Polygon Mock MCP server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

#### package.json scripts

```json
{
  "name": "crown-polygon-mock",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
```

#### Сборка

```bash
npm run build
```

### 1.2 Конфигурация Claude Desktop

Добавить в `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crown-polygon-mock": {
      "command": "node",
      "args": [
        "/Users/pasynkov/dev/crownhold/applications/mcp-polygon/dist/main.js"
      ]
    }
  }
}
```

**Важно:** Указать абсолютный путь!

### 1.3 Добавить инструкции в Claude Desktop

Скопировать упрощенные инструкции из [claude-desktop-instructions.md](../claude-desktop-instructions.md):

```
You have access to Crown Hold financial tools via MCP.

Tools available:
- polygon_get_balance - get Polygon USDC and MATIC balance

When user asks about balance, call polygon_get_balance tool.
Show the result in friendly format.

Currently in TESTING mode with mock data.
```

**Где добавить:**
1. Claude Desktop → Settings → Custom Instructions
2. Или создать Project "Crown Hold" с этими инструкциями
3. Или просто написать в начале разговора

### 1.4 Тестирование

#### Test 1: Claude видит tool?

Запустите Claude Desktop и спросите:

```
Вы: What tools do you have?

Ожидаемое:
Claude: I have access to the polygon_get_balance tool that can check
your Polygon wallet balance for USDC and MATIC.
```

Если Claude **НЕ** видит tool:
- ❌ MCP сервер не запустился
- Проверьте конфигурацию path
- Проверьте что `npm run build` выполнена
- Проверьте логи Claude Desktop

#### Test 2: Claude может вызвать tool?

```
Вы: What's my balance?

Ожидаемое:
Claude: [вызывает polygon_get_balance]
Your Polygon wallet balance:
- USDC: 5,234.50
- MATIC: 12.45
- Wallet: 0xMOCK1234567890abcdef
```

Если Claude **НЕ** вызывает tool:
- ❌ Инструкции не добавлены
- Добавьте Custom Instructions
- Или напишите их в начале разговора

#### Test 3: Повторный вызов

```
Вы: Check my balance again

Ожидаемое:
Claude: [снова вызывает polygon_get_balance]
[Показывает те же данные]
```

Если работает → ✅ **Интеграция успешна!**

### 1.5 Добавить второй tool (опционально)

Если первый tool работает, добавьте второй для уверенности:

```typescript
// В ListToolsRequestSchema
{
  name: 'polygon_get_token_price',
  description: 'Get current USDC price in EUR',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}

// В CallToolRequestSchema
if (name === 'polygon_get_token_price') {
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
```

Тест:

```
Вы: What's the USDC price?

Ожидаемое:
Claude: [calls polygon_get_token_price]
Current USDC price: 0.92 EUR
```

## Что тестируем

### Технический уровень
- ✅ MCP сервер запускается
- ✅ stdio communication работает
- ✅ Claude Desktop видит tools
- ✅ Параметры передаются корректно
- ✅ Результаты возвращаются корректно

### AI уровень
- ✅ Claude понимает когда использовать tools
- ✅ Claude правильно интерпретирует результаты
- ✅ Claude форматирует вывод для пользователя
- ✅ Инструкции работают

## Возможные проблемы

### Проблема: MCP сервер не запускается

**Проверка:**
```bash
# Запустить вручную
node applications/mcp-polygon/dist/main.js

# Должно вывести:
Crown Hold Polygon Mock MCP server running

# Ctrl+C для остановки
```

**Решения:**
- Проверить что `npm run build` выполнена
- Проверить что путь в config правильный
- Проверить что нет ошибок в коде

### Проблема: Claude не видит tools

**Проверка:**
```bash
# В Claude Desktop логи
~/Library/Logs/Claude/

# Или
Help → View Logs
```

**Решения:**
- Проверить config path абсолютный
- Перезапустить Claude Desktop полностью (CMD+Q)
- Проверить JSON syntax в config

### Проблема: Claude не вызывает tools

**Решение:**
Добавить **явные инструкции** в Custom Instructions или в начало разговора.

Без инструкций Claude может не понять что tool нужно использовать.

## Критерии завершения Phase 1A

- ✅ Минимальный MCP сервер создан и собран
- ✅ Конфигурация Claude Desktop добавлена
- ✅ Claude Desktop видит наш tool
- ✅ Claude может вызывать tool при запросе баланса
- ✅ Результаты корректно возвращаются и форматируются
- ✅ Инструкции для Claude работают

## Результат Phase 1A

**Доказано что:**
- ✅ MCP protocol работает
- ✅ stdio communication работает
- ✅ Claude Desktop integration работает
- ✅ Claude понимает как использовать tools
- ✅ Можно продолжать разработку полноценной системы

**Время:** ~1-2 часа кода + 1-2 часа тестирования и отладки

## Следующий шаг

После успешного завершения Phase 1A:
→ Переходим к [Phase 1B: Full Mock Services](phase-1b-full-mocks.md)

Теперь мы **уверены** что интеграция работает и можем разрабатывать полноценные mock сервисы.
