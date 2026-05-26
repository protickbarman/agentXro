const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');

class OsInfoTool extends Tool {
  constructor() {
    super('os_info', {
      description: 'Get operating system information',
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

  async execute() {
    try {
      return {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        arch: os.arch(),
        uptime: os.uptime(),
        uptimeFormatted: this.formatUptime(os.uptime()),
        endianness: os.endianness(),
        tmpdir: os.tmpdir(),
        homeDir: os.homedir(),
      };
    } catch (error) {
      logger.error(`OsInfo execution failed: ${error.message}`);
      throw error;
    }
  }

  formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  }
}

module.exports = OsInfoTool;
