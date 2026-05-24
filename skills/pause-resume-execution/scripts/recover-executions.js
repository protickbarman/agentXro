#!/usr/bin/env node

/**
 * Recover paused executions after restart
 * Usage: node scripts/recover-executions.js
 */

const ExecutionManager = require('../../services/ExecutionManager');

async function main() {
  console.log('Recovering paused executions...');

  try {
    await ExecutionManager.recoverPausedExecutions();
    const paused = ExecutionManager.listPaused();
    console.log(`Recovered ${paused.length} paused executions`);
    for (const exec of paused) {
      console.log(`  ${exec.id}: ${exec.agentName} (step ${exec.currentStep}/${exec.totalSteps})`);
    }
  } catch (err) {
    console.error('Recovery failed:', err.message);
    process.exit(1);
  }
}

main();
