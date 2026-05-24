#!/usr/bin/env node

/**
 * Test an integration's connectivity
 * Usage: node scripts/test-integration.js --id <integration-id>
 */

const IntegrationManager = require('../../services/IntegrationManager');

const args = process.argv.slice(2);
const parseArgs = (args) => {
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    opts[key] = args[i + 1];
  }
  return opts;
};

async function main() {
  const opts = parseArgs(args);

  if (!opts.id) {
    console.error('Usage: node test-integration.js --id <integration-id>');
    process.exit(1);
  }

  try {
    console.log(`Testing integration: ${opts.id}`);
    const result = await IntegrationManager.test(opts.id);

    if (result.status === 'healthy') {
      console.log(`✓ Status: HEALTHY (${result.latency}ms)`);
    } else {
      console.log(`✗ Status: UNHEALTHY (${result.latency}ms)`);
      console.log(`  Error: ${result.error}`);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

main();
