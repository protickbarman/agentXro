#!/usr/bin/env node

/**
 * Consolidate agent memories
 * Usage: node scripts/consolidate-memories.js --user-id <userId> [--strategy prune|merge-related|all]
 */

const MemoryManager = require('../../services/MemoryManager');

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

  if (!opts['user-id']) {
    console.error('Usage: node consolidate-memories.js --user-id <userId> [--strategy prune|merge-related|all]');
    process.exit(1);
  }

  try {
    console.log(`Consolidating memories for user: ${opts['user-id']}`);
    console.log(`Strategy: ${opts.strategy || 'prune'}`);

    const result = await MemoryManager.consolidate({
      userId: opts['user-id'],
      strategy: opts.strategy || 'prune',
      minImportance: parseInt(opts['min-importance'] || '3'),
    });

    console.log('\n✓ Consolidation complete:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Merged:    ${result.merged}`);
    console.log(`  Pruned:    ${result.pruned}`);
  } catch (err) {
    console.error('Consolidation failed:', err.message);
    process.exit(1);
  }
}

main();
