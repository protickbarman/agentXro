const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');
const { execSync } = require('child_process');

class PlatformTool extends Tool {
  constructor() {
    super('platform', {
      description: 'Detect Node.js version, npm version, platform, and architecture',
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
      const platform = os.platform();
      let npmVersion;
      try {
        npmVersion = execSync('npm --version', { encoding: 'utf8', timeout: 3000 }).trim();
      } catch {
        npmVersion = null;
      }

      return {
        nodeVersion: process.version,
        npmVersion,
        platform,
        arch: os.arch(),
        is_windows: platform === 'win32',
        is_mac: platform === 'darwin',
        is_linux: platform === 'linux',
        release: os.release(),
        hostname: os.hostname(),
      };
    } catch (error) {
      logger.error(`Platform execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PlatformTool;
