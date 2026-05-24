#!/usr/bin/env node

/**
 * Generate cost report
 * Usage: node scripts/cost-report.js [--period daily|weekly|monthly] [--group-by agent|user|provider|model]
 */

const CostTracker = require('../../services/CostTracker');

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

  try {
    const report = await CostTracker.getReport({
      groupBy: opts['group-by'] || 'agent',
      period: opts.period || 'daily',
    });

    console.log(`\n📊 Cost Report (${report.period})`);
    console.log('═'.repeat(50));
    console.log(`Total Requests: ${report.summary.requests}`);
    console.log(`Total Tokens:   ${report.summary.tokens.toLocaleString()}`);
    console.log(`Total Cost:     $${report.summary.cost.toFixed(4)}`);
    console.log('');

    if (report.dimensions.length > 0) {
      console.log(`Breakdown by ${opts['group-by'] || 'agent'}:`);
      console.log('─'.repeat(50));
      for (const dim of report.dimensions) {
        console.log(`${dim.dimension.padEnd(25)} ${dim.requests.toString().padStart(5)} req  ${dim.total_cost ? `$${parseFloat(dim.total_cost).toFixed(4)}`.padStart(10) : '$0'.padStart(10)}`);
      }
    }
  } catch (err) {
    console.error('Report generation failed:', err.message);
    process.exit(1);
  }
}

main();
