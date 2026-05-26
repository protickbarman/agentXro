const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ScientificNotationTool extends Tool {
  constructor() {
    super('scientific_notation', {
      description: 'Convert between decimal, scientific notation, and engineering notation',
      parameters: {
        type: 'object',
        properties: {
          value: { type: ['string', 'number'], description: 'The value to convert' },
          direction: { type: 'string', enum: ['to_sci', 'from_sci', 'to_eng'], description: 'Conversion direction' },
        },
        required: ['value', 'direction'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.value === undefined || params.value === null) throw new Error('value required');
    if (!params.direction) throw new Error('direction required');
    const valid = ['to_sci', 'from_sci', 'to_eng'];
    if (!valid.includes(params.direction)) throw new Error(`Invalid direction: ${params.direction}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, direction } = params;
      let result;
      if (direction === 'to_sci') {
        const n = Number(value);
        if (isNaN(n)) throw new Error('Invalid numeric value');
        result = n.toExponential();
      } else if (direction === 'from_sci') {
        const str = String(value).replace(/\s+/g, '');
        const n = Number(str);
        if (isNaN(n)) throw new Error('Invalid scientific notation');
        result = String(n);
      } else if (direction === 'to_eng') {
        const n = Number(value);
        if (isNaN(n)) throw new Error('Invalid numeric value');
        const exp = Math.floor(Math.log10(Math.abs(n)));
        const engExp = Math.floor(exp / 3) * 3;
        const mantissa = n / Math.pow(10, engExp);
        result = `${mantissa}e${engExp}`;
      }
      return { value: String(value), direction, result };
    } catch (e) {
      logger.error(`ScientificNotationTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ScientificNotationTool;
