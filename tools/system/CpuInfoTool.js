const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const os = require('os');

class CpuInfoTool extends Tool {
  constructor() {
    super('cpu_info', {
      description: 'Get CPU information including cores, model, load average, and usage',
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
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      const cores = cpus.map((cpu, index) => {
        const { user, nice, sys, idle, irq } = cpu.times;
        const total = user + nice + sys + idle + irq;
        const usagePercent = total > 0 ? Math.round(((total - idle) / total) * 10000) / 100 : 0;
        return {
          index,
          model: cpu.model,
          speed: cpu.speed,
          times: cpu.times,
          usagePercent,
        };
      });

      const totalUsage = cores.length > 0
        ? Math.round(cores.reduce((sum, c) => sum + c.usagePercent, 0) / cores.length * 100) / 100
        : 0;

      return {
        count: cpus.length,
        model: cpus.length > 0 ? cpus[0].model : null,
        speed: cpus.length > 0 ? cpus[0].speed : null,
        cores,
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2],
        },
        totalUsagePercent: totalUsage,
      };
    } catch (error) {
      logger.error(`CpuInfo execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CpuInfoTool;
