const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TrigTool extends Tool {
  constructor() {
    super('trigonometry', {
      description: 'Evaluate trigonometric functions: sin, cos, tan, asin, acos, atan',
      parameters: {
        type: 'object',
        properties: {
          func: { type: 'string', enum: ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'], description: 'Trigonometric function' },
          angle: { type: 'number', description: 'Angle value' },
          unit: { type: 'string', enum: ['deg', 'rad'], description: 'Angle unit (default: rad)' },
        },
        required: ['func', 'angle'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    const validFuncs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
    if (!validFuncs.includes(params.func)) {
      throw new Error(`func must be one of: ${validFuncs.join(', ')}`);
    }
    if (typeof params.angle !== 'number' || !isFinite(params.angle)) {
      throw new Error('angle must be a finite number');
    }
    if (params.unit && !['deg', 'rad'].includes(params.unit)) {
      throw new Error('unit must be "deg" or "rad"');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      let { func, angle, unit } = params;
      if (!unit) unit = 'rad';

      const rad = unit === 'deg' ? angle * Math.PI / 180 : angle;

      const fnMap = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
      };

      const raw = fnMap[func](func.startsWith('a') ? (unit === 'deg' ? angle * Math.PI / 180 : angle) : rad);
      const value = Math.round(raw * 1e15) / 1e15;

      return { func, angle, unit, value };
    } catch (error) {
      logger.error(`Trigonometry execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TrigTool;
