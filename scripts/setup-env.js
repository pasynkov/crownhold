#!/usr/bin/env node

/**
 * Crown Hold Environment Setup Script
 *
 * This script helps set up .env files for all MCP servers
 * by copying .env.example files and optionally prompting for values.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const APPS = [
  'mcp-polygon',
  'mcp-kraken',
  'mcp-wise'
];

const APPS_DIR = path.join(__dirname, '..', 'applications');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvFile(appName) {
  const appDir = path.join(APPS_DIR, appName);
  const envExamplePath = path.join(appDir, '.env.example');
  const envPath = path.join(appDir, '.env');

  console.log(`\n📦 Setting up ${appName}...`);

  // Check if .env.example exists
  if (!fs.existsSync(envExamplePath)) {
    console.log(`⚠️  .env.example not found for ${appName}, skipping...`);
    return;
  }

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const answer = await question(`   .env already exists for ${appName}. Overwrite? (y/N): `);
    if (answer.toLowerCase() !== 'y') {
      console.log(`   Skipped ${appName}`);
      return;
    }
  }

  // Copy .env.example to .env
  fs.copyFileSync(envExamplePath, envPath);
  console.log(`   ✅ Created .env file for ${appName}`);
  console.log(`   📝 Edit ${path.relative(process.cwd(), envPath)} to add your credentials`);
}

async function main() {
  console.log('👑 Crown Hold Environment Setup\n');
  console.log('This script will create .env files from .env.example templates.\n');
  console.log('⚠️  Remember to fill in actual values before running the applications!\n');

  const answer = await question('Continue? (Y/n): ');
  if (answer.toLowerCase() === 'n') {
    console.log('Setup cancelled.');
    rl.close();
    return;
  }

  for (const app of APPS) {
    await setupEnvFile(app);
  }

  console.log('\n✨ Setup complete!\n');
  console.log('Next steps:');
  console.log('1. Edit .env files in each application directory');
  console.log('2. Add your API keys and credentials');
  console.log('3. Run: npm install');
  console.log('4. Run: npm run build');
  console.log('5. Configure Claude Desktop (see docs/claude-setup.md)\n');

  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
