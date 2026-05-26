const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CurrencyFormatTool extends Tool {
  constructor() {
    super('currency_format', {
      description: 'Format number as currency string',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount to format' },
          currency: { type: 'string', description: 'Currency code (default USD)' },
          locale: { type: 'string', description: 'Locale (default en-US)' },
        },
        required: ['amount'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.amount === undefined || params.amount === null) throw new Error('amount required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { amount, currency = 'USD', locale = 'en-US' } = params;
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
      return { amount, currency, locale, formatted };
    } catch (e) {
      logger.error(`CurrencyFormatTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CurrencyFormatTool;
