const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

const ROMAN_MAP = {
  'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000,
};

class RomanNumeralTool extends Tool {
  constructor() {
    super('roman_numeral', {
      description: 'Convert to/from Roman numerals (1-3999)',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to convert' },
          direction: { type: 'string', enum: ['to_roman', 'to_number'], description: 'Conversion direction' },
        },
        required: ['value', 'direction'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value) throw new Error('value required');
    if (!params.direction) throw new Error('direction required');
    if (!['to_roman', 'to_number'].includes(params.direction)) throw new Error('Invalid direction');
    return true;
  }

  _toRoman(num) {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 1 || n > 3999) throw new Error('Number must be between 1 and 3999');
    let result = '';
    let remaining = n;
    for (const [val, sym] of ROMAN_NUMERALS) {
      while (remaining >= val) {
        result += sym;
        remaining -= val;
      }
    }
    return result;
  }

  _toNumber(roman) {
    const s = roman.toUpperCase();
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const cur = ROMAN_MAP[s[i]];
      if (!cur) throw new Error(`Invalid Roman numeral character: ${s[i]}`);
      const next = ROMAN_MAP[s[i + 1]] || 0;
      if (cur < next) {
        total -= cur;
      } else {
        total += cur;
      }
    }
    if (total < 1 || total > 3999) throw new Error('Result must be between 1 and 3999');
    return total;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, direction } = params;

      if (direction === 'to_roman') {
        const result = this._toRoman(value);
        return { direction, input: value, output: result };
      } else {
        const result = this._toNumber(value);
        return { direction, input: value, output: result };
      }
    } catch (e) {
      logger.error(`RomanNumeralTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = RomanNumeralTool;
