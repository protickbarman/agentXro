const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const TO_G = {
  mg: 0.001, g: 1, kg: 1000, ton: 1e6,
  lb: 453.592, oz: 28.3495, stone: 6350.29,
};

const UNIT_NAMES = {
  mg: 'milligram', g: 'gram', kg: 'kilogram', ton: 'metric ton',
  lb: 'pound', oz: 'ounce', stone: 'stone',
};

class WeightConvertTool extends Tool {
  constructor() {
    super('weight_convert', {
      description: 'Convert between weight units (mg, g, kg, ton, lb, oz, stone)',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Weight value' },
          from: { type: 'string', description: 'Source unit' },
          to: { type: 'string', description: 'Target unit' },
        },
        required: ['value', 'from', 'to'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.value === undefined || params.value === null) throw new Error('value required');
    if (!params.from) throw new Error('from required');
    if (!params.to) throw new Error('to required');
    if (!(params.from in TO_G)) throw new Error(`Unknown unit: ${params.from}`);
    if (!(params.to in TO_G)) throw new Error(`Unknown unit: ${params.to}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to } = params;
      const grams = value * TO_G[from];
      const result = grams / TO_G[to];
      return {
        value, from: { unit: from, name: UNIT_NAMES[from] },
        to: { unit: to, name: UNIT_NAMES[to] },
        result,
        grams,
      };
    } catch (e) {
      logger.error(`WeightConvertTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = WeightConvertTool;
