const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class BasicStatsTool extends Tool {
  constructor() {
    super('basic_stats', {
      description: 'Compute basic statistics: mean, median, mode, min, max, range, stddev, variance',
      parameters: {
        type: 'object',
        properties: {
          values: { type: 'array', items: { type: 'number' }, description: 'Array of numbers' },
          ops: { type: 'array', items: { type: 'string' }, description: 'Operations to perform (default: ["mean"])' },
        },
        required: ['values'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    if (!Array.isArray(params.values) || params.values.length === 0) {
      throw new Error('values must be a non-empty array');
    }
    if (!params.values.every(v => typeof v === 'number' && isFinite(v))) {
      throw new Error('All values must be finite numbers');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { values } = params;
      const ops = params.ops || ['mean'];
      const n = values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((s, v) => s + v, 0);
      const results = {};

      for (const op of ops) {
        switch (op) {
          case 'mean':
            results.mean = sum / n;
            break;
          case 'median': {
            const mid = Math.floor(n / 2);
            results.median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            break;
          }
          case 'mode': {
            const freq = {};
            let maxFreq = 0;
            for (const v of values) {
              freq[v] = (freq[v] || 0) + 1;
              if (freq[v] > maxFreq) maxFreq = freq[v];
            }
            results.mode = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
            break;
          }
          case 'min':
            results.min = sorted[0];
            break;
          case 'max':
            results.max = sorted[n - 1];
            break;
          case 'range':
            results.range = sorted[n - 1] - sorted[0];
            break;
          case 'stddev': {
            const mean = sum / n;
            const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
            results.stddev = Math.sqrt(variance);
            break;
          }
          case 'variance': {
            const mean2 = sum / n;
            results.variance = values.reduce((s, v) => s + (v - mean2) ** 2, 0) / n;
            break;
          }
          default:
            throw new Error(`Unknown operation: ${op}`);
        }
      }
      return results;
    } catch (error) {
      logger.error(`BasicStats execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BasicStatsTool;
