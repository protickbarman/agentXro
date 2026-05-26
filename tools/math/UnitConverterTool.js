const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class UnitConverterTool extends Tool {
  constructor() {
    super('unit_converter', {
      description: 'Convert between units of length, mass, volume, speed, temperature',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Numeric value to convert' },
          from: { type: 'string', description: 'Source unit' },
          to: { type: 'string', description: 'Target unit' },
          category: { type: 'string', enum: ['length', 'mass', 'volume', 'speed', 'temperature'], description: 'Unit category' },
        },
        required: ['value', 'from', 'to', 'category'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.value !== 'number' || !isFinite(params.value)) {
      throw new Error('value must be a finite number');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to, category } = params;

      const conversions = {
        length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254 },
        mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
        volume: { l: 1, ml: 0.001, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, fl_oz: 0.0295735 },
        speed: { m_s: 1, km_h: 0.277778, mph: 0.44704, ft_s: 0.3048, knot: 0.514444 },
      };

      if (category === 'temperature') {
        let celsius;
        switch (from) {
          case 'celsius': celsius = value; break;
          case 'fahrenheit': celsius = (value - 32) * 5 / 9; break;
          case 'kelvin': celsius = value - 273.15; break;
          default: throw new Error(`Unknown temperature unit: ${from}`);
        }
        let result;
        switch (to) {
          case 'celsius': result = celsius; break;
          case 'fahrenheit': result = celsius * 9 / 5 + 32; break;
          case 'kelvin': result = celsius + 273.15; break;
          default: throw new Error(`Unknown temperature unit: ${to}`);
        }
        return { value, from, to, category, result: Math.round(result * 1e10) / 1e10 };
      }

      const units = conversions[category];
      if (!units) throw new Error(`Unknown category: ${category}`);
      if (!(from in units)) throw new Error(`Unknown unit: ${from} in ${category}`);
      if (!(to in units)) throw new Error(`Unknown unit: ${to} in ${category}`);

      const result = value * units[from] / units[to];
      return { value, from, to, category, result: Math.round(result * 1e10) / 1e10 };
    } catch (error) {
      logger.error(`UnitConverter execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UnitConverterTool;
