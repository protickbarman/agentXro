#!/usr/bin/env node

/**
 * Create an agent with CLI
 * Usage: node scripts/create-agent.js --name "my-agent" --type "search" --template "default-search-agent"
 */

const path = require('path');
const AgentFactory = require('../../services/AgentFactory');

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

  if (!opts.name || !opts.type) {
    console.error('Usage: node create-agent.js --name <name> --type <type> [--template <template>] [--description <desc>] [--model <model>]');
    process.exit(1);
  }

  try {
    let agent;
    if (opts.template) {
      agent = await AgentFactory.createFromTemplate(opts.template, {
        name: opts.name,
        description: opts.description,
        llmConfig: opts.model ? { provider: 'nim', model: opts.model } : undefined,
        tools: opts.tools ? opts.tools.split(',') : undefined,
      });
    } else {
      agent = await AgentFactory.createAgent({
        name: opts.name,
        type: opts.type,
        description: opts.description || `${opts.type} agent`,
        llmConfig: { provider: 'nim', model: opts.model || 'deepseek-ai/deepseek-v4-flash' },
        tools: opts.tools ? opts.tools.split(',') : [],
        capabilities: {},
        config: { useSoul: true },
      });
    }

    console.log(`Agent created: ${agent.name} (${agent.type})`);
    console.log(`Description: ${agent.description || 'N/A'}`);

    const registry = require('../../agents/AgentRegistry');
    await registry.register(opts.name, agent);
    console.log(`Agent registered: ${opts.name}`);
  } catch (err) {
    console.error('Failed to create agent:', err.message);
    process.exit(1);
  }
}

main();
