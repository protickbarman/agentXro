const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class LinearRegressionTool extends Tool {
  constructor() {
    super('linear_regression', {
      description: 'Compute linear regression: slope, intercept, r_squared from x/y points',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'array', items: { type: 'number' }, description: 'X values' },
          y: { type: 'array', items: { type: 'number' }, description: 'Y values' },
        },
        required: ['x', 'y'],
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
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { x, y } = params;
      const n = x.length;
      const sumX = x.reduce((s, v) => s + v, 0);
      const sumY = y.reduce((s, v) => s + v, 0);
      const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
      const sumX2 = x.reduce((s, v) => s + v * v, 0);
      const sumY2 = y.reduce((s, v) => s + v * v, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const rNum = n * sumXY - sumX * sumY;
      const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      const r_squared = rDen === 0 ? 0 : (rNum / rDen) ** 2;

      return { slope, intercept, r_squared };
    } catch (error) {
      logger.error(`LinearRegression execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = LinearRegressionTool;
