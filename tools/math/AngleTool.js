const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class AngleTool extends Tool {
  constructor() {
    super('angle', {
      description: 'Convert and normalize angles between degrees and radians',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Angle value' },
          from: { type: 'string', enum: ['deg', 'rad'], description: 'Source unit' },
          to: { type: 'string', enum: ['deg', 'rad'], description: 'Target unit' },
        },
        required: ['value', 'from', 'to'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.value !== 'number' || !isFinite(params.value)) {
      throw new Error('value must be a finite number');
    }
    if (!['deg', 'rad'].includes(params.from)) {
      throw new Error('from must be "deg" or "rad"');
    }
    if (!['deg', 'rad'].includes(params.to)) {
      throw new Error('to must be "deg" or "rad"');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to } = params;

      let result;
      if (from === to) {
        result = value;
      } else if (from === 'deg' && to === 'rad') {
        result = value * Math.PI / 180;
      } else {
        result = value * 180 / Math.PI;
      }

      return { value, from, to, result: Math.round(result * 1e15) / 1e15 };
    } catch (error) {
      logger.error(`Angle execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AngleTool;
