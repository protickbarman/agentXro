const Tool = require('../base/Tool');
const logger = require('../../config/logger');
const axios = require('axios');

class ExchangeRateTool extends Tool {
  constructor() {
    super('exchange_rate', {
      description: 'Get exchange rate between currencies (uses Frankfurter API)',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Source currency code (e.g. USD)' },
          to: { type: 'string', description: 'Target currency code (e.g. EUR)' },
          amount: { type: 'number', description: 'Amount to convert' },
        },
        required: ['from', 'to'],
      },
    });
    this.timeout = 10000;
  }

  validate(p) {
    if (!p.from || typeof p.from !== 'string') throw new Error('from is required');
    if (!p.to || typeof p.to !== 'string') throw new Error('to is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      const url = `https://api.frankfurter.app/latest`;
      const res = await axios.get(url, {
        params: { from: p.from.toUpperCase(), to: p.to.toUpperCase() },
        timeout: this.timeout,
      });
      const rate = res.data.rates?.[p.to.toUpperCase()];
      const amount = p.amount || 1;
      return this.formatResult({
        from: p.from.toUpperCase(), to: p.to.toUpperCase(), rate, amount,
        converted: rate ? parseFloat((amount * rate).toFixed(4)) : null,
      });
    } catch (e) {
      logger.error(`ExchangeRateTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = ExchangeRateTool;
