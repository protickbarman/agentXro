const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TemperatureConvertTool extends Tool {
  constructor() {
    super('temperature_convert', {
      description: 'Convert temperatures between Celsius, Fahrenheit, Kelvin, and Rankine',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Temperature value' },
          from: { type: 'string', enum: ['C', 'F', 'K', 'R'], description: 'Source unit' },
          to: { type: 'string', enum: ['C', 'F', 'K', 'R'], description: 'Target unit' },
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
    const valid = ['C', 'F', 'K', 'R'];
    if (!valid.includes(params.from)) throw new Error(`Invalid from: ${params.from}`);
    if (!valid.includes(params.to)) throw new Error(`Invalid to: ${params.to}`);
    return true;
  }

  toCelsius(value, from) {
    switch (from) {
      case 'C': return value;
      case 'F': return (value - 32) * 5 / 9;
      case 'K': return value - 273.15;
      case 'R': return (value - 491.67) * 5 / 9;
    }
  }

  fromCelsius(value, to) {
    switch (to) {
      case 'C': return value;
      case 'F': return value * 9 / 5 + 32;
      case 'K': return value + 273.15;
      case 'R': return (value + 273.15) * 9 / 5;
    }
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, from, to } = params;
      const celsius = this.toCelsius(value, from);
      const result = this.fromCelsius(celsius, to);
      return { value, from, to, result, celsius: Math.round(celsius * 100) / 100 };
    } catch (e) {
      logger.error(`TemperatureConvertTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TemperatureConvertTool;
