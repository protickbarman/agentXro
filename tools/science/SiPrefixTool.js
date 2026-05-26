const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const PREFIX_TABLE = {
  n: 1e-9, μ: 1e-6, m: 1e-3, '': 1,
  k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15,
};

const PREFIX_NAMES = {
  n: 'nano', μ: 'micro', m: 'milli', '': 'base',
  k: 'kilo', M: 'mega', G: 'giga', T: 'tera', P: 'peta',
};

class SiPrefixTool extends Tool {
  constructor() {
    super('si_prefix', {
      description: 'Convert values between SI prefixes (nano, micro, milli, base, kilo, mega, giga, tera, peta)',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'The numeric value' },
          from: { type: 'string', description: 'Source prefix (n, μ, m, k, M, G, T, P, or empty for base)' },
          to: { type: 'string', description: 'Target prefix (n, μ, m, k, M, G, T, P, or empty for base)' },
        },
        required: ['value', 'from', 'to'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.value === undefined || params.value === null) throw new Error('value required');
    if (params.from === undefined || params.from === null) throw new Error('from required');
    if (params.to === undefined || params.to === null) throw new Error('to required');
    const from = params.from || '';
    const to = params.to || '';
    if (!(from in PREFIX_TABLE)) throw new Error(`Unknown prefix: ${params.from}`);
    if (!(to in PREFIX_TABLE)) throw new Error(`Unknown prefix: ${params.to}`);
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const from = params.from || '';
      const to = params.to || '';
      const baseValue = params.value * PREFIX_TABLE[from];
      const result = baseValue / PREFIX_TABLE[to];
      return {
        value: params.value,
        from: { prefix: from, name: PREFIX_NAMES[from] },
        to: { prefix: to, name: PREFIX_NAMES[to] },
        result,
      };
    } catch (e) {
      logger.error(`SiPrefixTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = SiPrefixTool;
