const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class StatisticsTool extends Tool {
  constructor() {
    super('statistics', {
      description: 'Advanced statistics: quartiles, percentiles, IQR, skewness, kurtosis',
      parameters: {
        type: 'object',
        properties: {
          values: { type: 'array', items: { type: 'number' }, description: 'Array of numbers' },
          ops: { type: 'array', items: { type: 'string' }, description: 'Operations to perform (default: all)' },
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

  percentile(sorted, p) {
    const n = sorted.length;
    const k = (p / 100) * (n - 1);
    const f = Math.floor(k);
    const c = Math.ceil(k);
    if (f === c) return sorted[f];
    return sorted[f] * (c - k) + sorted[c] * (k - f);
  }

  async execute(params) {
    try {
      this.validate(params);
      const { values } = params;
      const ops = params.ops || ['quartiles', 'percentiles', 'iqr', 'skewness', 'kurtosis'];
      const sorted = [...values].sort((a, b) => a - b);
      const n = values.length;
      const mean = values.reduce((s, v) => s + v, 0) / n;
      const results = {};

      for (const op of ops) {
        switch (op) {
          case 'quartiles':
            results.quartiles = {
              q1: this.percentile(sorted, 25),
              q2: this.percentile(sorted, 50),
              q3: this.percentile(sorted, 75),
            };
            break;
          case 'percentiles': {
            const pts = {};
            for (let p = 10; p <= 90; p += 10) {
              pts[`p${p}`] = this.percentile(sorted, p);
            }
            results.percentiles = pts;
            break;
          }
          case 'iqr':
            results.iqr = this.percentile(sorted, 75) - this.percentile(sorted, 25);
            break;
          case 'skewness': {
            const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
            const stddev = Math.sqrt(variance);
            if (stddev === 0) { results.skewness = 0; break; }
            const skew = values.reduce((s, v) => s + ((v - mean) / stddev) ** 3, 0) / n;
            results.skewness = skew;
            break;
          }
          case 'kurtosis': {
            const variance2 = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
            const stddev2 = Math.sqrt(variance2);
            if (stddev2 === 0) { results.kurtosis = 0; break; }
            const kurt = values.reduce((s, v) => s + ((v - mean) / stddev2) ** 4, 0) / n - 3;
            results.kurtosis = kurt;
            break;
          }
          default:
            throw new Error(`Unknown operation: ${op}`);
        }
      }

      return results;
    } catch (error) {
      logger.error(`Statistics execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = StatisticsTool;
