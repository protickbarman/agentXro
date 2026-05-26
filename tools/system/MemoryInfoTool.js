const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');

class MemoryInfoTool extends Tool {
  constructor() {
    super('memory_info', {
      description: 'Get system memory usage information',
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

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
  }

  async execute() {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const percent = total > 0 ? Math.round((used / total) * 10000) / 100 : 0;

      return {
        totalBytes: total,
        freeBytes: free,
        usedBytes: used,
        percentUsed: percent,
        total: this.formatBytes(total),
        free: this.formatBytes(free),
        used: this.formatBytes(used),
      };
    } catch (error) {
      logger.error(`MemoryInfo execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MemoryInfoTool;
