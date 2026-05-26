const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const TO_PA = {
  Pa: 1, kPa: 1000, atm: 101325, bar: 100000,
  psi: 6894.757, mmHg: 133.322, torr: 133.322,
};

const UNIT_NAMES = {
  Pa: 'pascal', kPa: 'kilopascal', atm: 'atmosphere',
  bar: 'bar', psi: 'pound per square inch',
  mmHg: 'millimeter of mercury', torr: 'torr',
};

class PressureConvertTool extends Tool {
  constructor() {
    super('pressure_convert', {
      description: 'Convert between pressure units (Pa, kPa, atm, bar, psi, mmHg, torr)',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Pressure value' },
          from: { type: 'string', description: 'Source unit (Pa, kPa, atm, bar, psi, mmHg, torr)' },
          to: { type: 'string', description: 'Target unit (Pa, kPa, atm, bar, psi, mmHg, torr)' },
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
    if (!(params.from in TO_PA)) throw new Error(`Unknown unit: ${params.from}`);
    if (!(params.to in TO_PA)) throw new Error(`Unknown unit: ${params.to}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to } = params;
      const pascals = value * TO_PA[from];
      const result = pascals / TO_PA[to];
      const resultRounded = Math.round(result * 1e6) / 1e6;
      return {
        value, from: { unit: from, name: UNIT_NAMES[from] },
        to: { unit: to, name: UNIT_NAMES[to] },
        result: resultRounded,
        pascals,
      };
    } catch (e) {
      logger.error(`PressureConvertTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = PressureConvertTool;
