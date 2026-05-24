#!/usr/bin/env node

/**
 * Deploy an agent via queue
 * Usage: node scripts/deploy-agent.js --name "my-agent" --queue "deployment"
 */

const QueueManager = require('../../queue/QueueManager');

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

  if (!opts.name) {
    console.error('Usage: node deploy-agent.js --name <agent-name> [--queue <queue>] [--schedule <cron>]');
    process.exit(1);
  }

  try {
    const job = await QueueManager.addJob(
      opts.queue || 'deployment',
      'deploy_agent',
      {
        agentName: opts.name,
        schedule: opts.schedule || null,
        timestamp: new Date().toISOString(),
      },
      { priority: 'high', attempts: 3 }
    );

    console.log(`Deployment queued: ${opts.name}`);
    console.log(`Job ID: ${job.id}`);
    console.log(`Queue: ${opts.queue || 'deployment'}`);
  } catch (err) {
    console.error('Deployment failed:', err.message);
    process.exit(1);
  }
}

main();
