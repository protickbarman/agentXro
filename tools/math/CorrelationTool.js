const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CorrelationTool extends Tool {
  constructor() {
    super('correlation', {
      description: 'Compute Pearson or Spearman correlation coefficient',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'array', items: { type: 'number' }, description: 'X values' },
          y: { type: 'array', items: { type: 'number' }, description: 'Y values' },
          method: { type: 'string', enum: ['pearson', 'spearman'], description: 'Correlation method' },
        },
        required: ['x', 'y', 'method'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!Array.isArray(params.x) || !Array.isArray(params.y)) {
      throw new Error('x and y must be arrays');
    }
    if (params.x.length !== params.y.length || params.x.length < 2) {
      throw new Error('x and y must have same length >= 2');
    }
    for (const v of [...params.x, ...params.y]) {
      if (typeof v !== 'number' || !isFinite(v)) throw new Error('All values must be finite numbers');
    }
    if (!['pearson', 'spearman'].includes(params.method)) {
      throw new Error('method must be "pearson" or "spearman"');
    }
    return true;
  }

  pearson(x, y) {
    const n = x.length;
    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
    const sumX2 = x.reduce((s, v) => s + v * v, 0);
    const sumY2 = y.reduce((s, v) => s + v * v, 0);
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
  }

  spearman(x, y) {
    const rank = (arr) => {
      const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      const ranks = new Array(arr.length);
      sorted.forEach((item, idx) => { ranks[item.i] = idx + 1; });
      return ranks;
    };
    return this.pearson(rank(x), rank(y));
  }

  async execute(params) {
    try {
      this.validate(params);
      const { x, y, method } = params;
      const coefficient = method === 'pearson' ? this.pearson(x, y) : this.spearman(x, y);
      return { method, coefficient };
    } catch (error) {
      logger.error(`Correlation execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CorrelationTool;
