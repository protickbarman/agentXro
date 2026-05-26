const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');
const fs = require('fs');

class DiskInfoTool extends Tool {
  constructor() {
    super('disk_info', {
      description: 'Get disk information for a given path',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Filesystem path to check (default: current working directory)' },
        },
        required: [],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.path && typeof params.path !== 'string') {
      throw new Error('Path must be a string');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const targetPath = params.path || process.cwd();

      let statfs;
      try {
        statfs = fs.statfsSync(targetPath);
      } catch {
        return {
          path: targetPath,
          message: 'Disk info not available on this platform',
          osHostname: os.hostname(),
          osPlatform: os.platform(),
        };
      }

      const blockSize = statfs.bsize;
      const totalBlocks = statfs.blocks;
      const freeBlocks = statfs.bfree;
      const availBlocks = statfs.bavail;

      const total = totalBlocks * blockSize;
      const free = freeBlocks * blockSize;
      const available = availBlocks * blockSize;
      const used = total - free;
      const percentUsed = total > 0 ? Math.round((used / total) * 10000) / 100 : 0;

      const format = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let v = bytes;
        let i = 0;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return `${Math.round(v * 100) / 100} ${units[i]}`;
      };

      return {
        path: targetPath,
        type: statfs.type,
        totalBytes: total,
        freeBytes: free,
        availableBytes: available,
        usedBytes: used,
        percentUsed,
        total: format(total),
        free: format(free),
        available: format(available),
        used: format(used),
      };
    } catch (error) {
      logger.error(`DiskInfo execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DiskInfoTool;
