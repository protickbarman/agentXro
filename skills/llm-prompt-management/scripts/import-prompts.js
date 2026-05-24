#!/usr/bin/env node

/**
 * Import prompts from a JSON file
 * Usage: node scripts/import-prompts.js --file prompts.json
 */

const path = require('path');
const fs = require('fs');
const PromptRegistry = require('../../services/PromptRegistry');

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

  if (!opts.file) {
    console.error('Usage: node import-prompts.js --file <prompts.json>');
    process.exit(1);
  }

  const filePath = path.resolve(opts.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const prompts = Array.isArray(data) ? data : [data];

    let imported = 0;
    for (const prompt of prompts) {
      try {
        await PromptRegistry.create(prompt.name, prompt);
        console.log(`✓ Imported: ${prompt.name}`);
        imported++;
      } catch (err) {
        console.error(`✗ Failed: ${prompt.name} - ${err.message}`);
      }
    }

    console.log(`\nImported ${imported}/${prompts.length} prompts successfully`);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  }
}

main();
