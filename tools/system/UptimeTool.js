const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');

class UptimeTool extends Tool {
  constructor() {
    super('uptime', {
      description: 'Get system and process uptime',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    });
    this.timeout = 5000;
  }

  validate() {
    return true;
  }

  formatDuration(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  async execute() {
    try {
      const sysUptime = os.uptime();
      const procUptime = process.uptime();

      return {
        systemUptime: {
          seconds: sysUptime,
          formatted: this.formatDuration(sysUptime),
        },
        processUptime: {
          seconds: procUptime,
          formatted: this.formatDuration(procUptime),
        },
      };
    } catch (error) {
      logger.error(`Uptime execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UptimeTool;
