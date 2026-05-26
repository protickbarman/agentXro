const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');

class WhichTool extends Tool {
  constructor() {
    super('which', {
      description: 'Locate an executable in the system PATH',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command/executable name to locate' },
        },
        required: ['command'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.command) throw new Error('Command is required');
    if (typeof params.command !== 'string') throw new Error('Command must be a string');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const cmd = params.command;
      const pathEnv = process.env.PATH || '';
      const dirs = pathEnv.split(path.delimiter);

      for (const dir of dirs) {
        const fullPath = path.join(dir, cmd);
        try {
          fs.accessSync(fullPath, fs.constants.X_OK);
          return { command: cmd, path: fullPath, found: true };
        } catch {
          continue;
        }
      }

      return { command: cmd, path: null, found: false };
    } catch (error) {
      logger.error(`Which execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = WhichTool;
