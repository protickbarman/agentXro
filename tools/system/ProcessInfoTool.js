const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ProcessInfoTool extends Tool {
  constructor() {
    super('process_info', {
      description: 'Get information about the current Node.js process',
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

  formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  async execute() {
    try {
      const mem = process.memoryUsage();

      return {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        uptime: process.uptime(),
        uptimeFormatted: this.formatUptime(process.uptime()),
        memoryUsage: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
          arrayBuffers: mem.arrayBuffers || 0,
        },
        argv: process.argv,
        cwd: process.cwd(),
        execPath: process.execPath,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch,
        release: process.release,
        features: process.features,
      };
    } catch (error) {
      logger.error(`ProcessInfo execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ProcessInfoTool;
