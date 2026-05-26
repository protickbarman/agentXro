const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const TO_M = {
  mm: 0.001, cm: 0.01, m: 1, km: 1000,
  inch: 0.0254, foot: 0.3048, yard: 0.9144,
  mile: 1609.344, nautical_mile: 1852,
};

const UNIT_NAMES = {
  mm: 'millimeter', cm: 'centimeter', m: 'meter', km: 'kilometer',
  inch: 'inch', foot: 'foot', yard: 'yard',
  mile: 'mile', nautical_mile: 'nautical mile',
};

class DistanceConvertTool extends Tool {
  constructor() {
    super('distance_convert', {
      description: 'Convert between distance units (mm, cm, m, km, inch, foot, yard, mile, nautical_mile)',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Distance value' },
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
    if (!(params.from in TO_M)) throw new Error(`Unknown unit: ${params.from}`);
    if (!(params.to in TO_M)) throw new Error(`Unknown unit: ${params.to}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to } = params;
      const meters = value * TO_M[from];
      const result = meters / TO_M[to];
      return {
        value, from: { unit: from, name: UNIT_NAMES[from] },
        to: { unit: to, name: UNIT_NAMES[to] },
        result,
        meters,
      };
    } catch (e) {
      logger.error(`DistanceConvertTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DistanceConvertTool;
