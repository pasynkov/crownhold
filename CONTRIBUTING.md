# Contributing to Crown Hold

Thank you for your interest in contributing to Crown Hold!

## Development Setup

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

Quick version:
```bash
git clone <repo>
cd crownhold
npm install
./scripts/check-structure.sh
```

## Project Structure

Crown Hold is organized as a monorepo with three NestJS MCP servers:

```
applications/
├── mcp-polygon/    # Polygon blockchain integration
├── mcp-kraken/     # Kraken exchange integration
└── mcp-wise/       # Wise transfers integration
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete details.

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Changes

Follow these guidelines:

**Code Style:**
- Use TypeScript strict mode
- Follow NestJS conventions
- Add JSDoc comments for public APIs
- Use descriptive variable names
- Keep functions small and focused

**Testing:**
- Add unit tests for new functions
- Add integration tests for API calls
- Maintain >80% code coverage
- Test error scenarios

**Documentation:**
- Update README if adding features
- Add JSDoc comments
- Update relevant docs/ files
- Add examples to workflows.md

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Test specific application
npm run test:polygon

# Watch mode for development
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### 4. Update Documentation

If you changed:
- **MCP tools** → Update docs/mcp-servers.md
- **Configuration** → Update docs/environment-setup.md
- **Workflows** → Update docs/workflows.md
- **Architecture** → Update docs/architecture.md

### 5. Commit Your Changes

Use conventional commits:

```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(polygon): add token price caching"
git commit -m "fix(kraken): handle rate limit errors"
git commit -m "docs: update Claude setup instructions"
git commit -m "test(wise): add transfer validation tests"
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a pull request with:
- Clear description of changes
- Link to related issues
- Test results
- Screenshots (if UI changes)

## Code Guidelines

### TypeScript Style

```typescript
// ✅ Good
interface TransferParams {
  recipient: string;
  amount: number;
  currency: string;
}

async function createTransfer(params: TransferParams): Promise<TransferResult> {
  // Validate inputs
  if (params.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Execute operation
  const result = await this.api.transfer(params);

  // Return structured result
  return {
    success: true,
    data: result
  };
}

// ❌ Bad
async function doStuff(a, b, c) {
  return await api.call(a, b, c);
}
```

### Error Handling

```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  this.logger.error('Operation failed', { error, context });
  return {
    success: false,
    error: {
      code: 'OPERATION_FAILED',
      message: error.message,
      details: this.sanitizeError(error)
    }
  };
}

// ❌ Bad
try {
  return await riskyOperation();
} catch (e) {
  console.log(e);
}
```

### Validation

```typescript
// ✅ Good
function validateAmount(amount: number, maxAmount: number): void {
  if (typeof amount !== 'number') {
    throw new ValidationError('Amount must be a number');
  }
  if (amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }
  if (amount > maxAmount) {
    throw new ValidationError(`Amount exceeds maximum: ${maxAmount}`);
  }
}

// ❌ Bad
function check(x) {
  if (x > 1000) throw new Error('bad');
}
```

## Security Guidelines

### Never Commit Secrets

```bash
# ✅ Good
KRAKEN_API_KEY=process.env.KRAKEN_API_KEY

# ❌ Bad
KRAKEN_API_KEY=abc123xyz

# Always use .env files
# Check .gitignore includes .env
```

### Validate All Inputs

```typescript
// ✅ Good
function transfer(recipient: string, amount: number) {
  // Validate recipient is whitelisted
  if (!this.allowedRecipients.includes(recipient)) {
    throw new Error('Recipient not allowed');
  }

  // Validate amount
  if (amount > this.maxAmount) {
    throw new Error('Amount too large');
  }

  // Proceed with transfer
}

// ❌ Bad
function transfer(recipient, amount) {
  // No validation
  api.transfer(recipient, amount);
}
```

### Log Securely

```typescript
// ✅ Good
this.logger.log('Transfer initiated', {
  recipient: recipient,  // OK - just identifier
  amount: amount,
  txId: result.id
});

// ❌ Bad
this.logger.log('Transfer initiated', {
  privateKey: this.privateKey,  // NEVER log secrets
  apiSecret: this.apiSecret
});
```

## Testing Guidelines

### Unit Tests

```typescript
describe('PolygonService', () => {
  let service: PolygonService;
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    service = new PolygonService(mockProvider);
  });

  describe('getBalance', () => {
    it('should return USDC balance', async () => {
      mockProvider.getBalance.mockResolvedValue('5000000000'); // 5000 USDC

      const result = await service.getBalance();

      expect(result.usdc).toBe('5000.00');
    });

    it('should handle provider errors', async () => {
      mockProvider.getBalance.mockRejectedValue(new Error('Network error'));

      await expect(service.getBalance()).rejects.toThrow('Network error');
    });
  });
});
```

### Integration Tests

```typescript
describe('Polygon MCP Integration', () => {
  it('should complete full transfer workflow', async () => {
    // Setup
    const initialBalance = await service.getBalance();

    // Execute
    const transfer = await service.transfer({
      recipient: 'kraken',
      amount: 100
    });

    // Verify
    expect(transfer.success).toBe(true);
    expect(transfer.data.transactionHash).toBeDefined();

    // Check balance changed
    const finalBalance = await service.getBalance();
    expect(parseFloat(finalBalance.usdc)).toBeLessThan(
      parseFloat(initialBalance.usdc)
    );
  });
});
```

## Documentation Guidelines

### Code Comments

```typescript
/**
 * Transfers USDC to a predefined recipient address.
 *
 * @param recipient - Recipient identifier (e.g., 'kraken')
 * @param amount - Amount in USDC to transfer
 * @returns Transaction details including hash and status
 * @throws {ValidationError} If recipient unknown or amount invalid
 * @throws {InsufficientBalanceError} If balance too low
 */
async transferUSDC(recipient: string, amount: number): Promise<TransferResult> {
  // Implementation
}
```

### Markdown Documentation

Use clear headings and examples:

```markdown
## Feature Name

Brief description of what it does.

### Usage

\`\`\`typescript
const result = await service.doSomething();
\`\`\`

### Parameters

- `param1` - Description
- `param2` - Description

### Returns

Description of return value

### Errors

- `ERROR_CODE` - When this happens
```

## Common Tasks

### Adding a New MCP Tool

1. Define tool schema in `*.service.ts`
2. Implement handler function
3. Add input validation
4. Add error handling
5. Add logging
6. Write unit tests
7. Write integration tests
8. Update documentation

### Adding a New Dependency

```bash
# Add to specific application
npm install <package> --workspace=applications/mcp-polygon

# Add to root (dev dependencies)
npm install <package> --save-dev
```

### Updating Documentation

Documentation lives in `docs/`:
- Architecture → `docs/architecture.md`
- MCP servers → `docs/mcp-servers.md`
- Setup → `docs/claude-setup.md`, `docs/environment-setup.md`
- Usage → `docs/workflows.md`

## Getting Help

- 📖 Read existing documentation
- 💬 Ask questions in issues
- 🐛 Report bugs with reproducible examples
- 💡 Suggest features with use cases

## Code Review Process

PRs will be reviewed for:
- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation completeness
- ✅ Security considerations
- ✅ Breaking changes noted

## Release Process

Releases follow semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or check [CLAUDE.md](CLAUDE.md) for project context.

---

Thank you for contributing to Crown Hold! 👑
