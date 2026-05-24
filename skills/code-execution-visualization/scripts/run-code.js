#!/usr/bin/env node

/**
 * Run a code execution
 * Usage: node scripts/run-code.js --code "console.log('hello')" [--language javascript] [--timeout 10000]
 */

const path = require('path');
const fs = require('fs');
const SandboxManager = require('../../services/SandboxManager');
const { v4: uuidv4 } = require('uuid');

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

  let code = opts.code;
  if (!code && opts.file) {
    code = fs.readFileSync(path.resolve(opts.file), 'utf8');
  }
  if (!code) {
    console.error('Usage: node run-code.js --code "..." [--language javascript] [--timeout 10000]');
    console.error('   or: node run-code.js --file script.js [--language javascript]');
    process.exit(1);
  }

  const sandbox = SandboxManager.create({
    timeout: parseInt(opts.timeout || '10000'),
    language: opts.language || 'javascript',
  });

  try {
    console.log('Executing...\n');

    const result = await SandboxManager.execute({
      code,
      language: opts.language || 'javascript',
      input: opts.input,
      sandboxId: sandbox.id,
      timeout: parseInt(opts.timeout || '10000'),
    });

    if (result.output.text) {
      console.log(result.output.text);
    }
    if (result.output.error) {
      console.error('Error:', result.output.error);
    }

    console.log(`\nExecuted in ${result.metrics.executionTime}ms`);
    console.log(`Status: ${result.success ? '✓ Success' : '✗ Failed'}`);
  } catch (err) {
    console.error('Execution error:', err.message);
  } finally {
    SandboxManager.destroy(sandbox.id);
  }
}

main();
