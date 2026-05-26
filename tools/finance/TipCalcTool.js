const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TipCalcTool extends Tool {
  constructor() {
    super('tip_calc', {
      description: 'Tip and split calculator',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Bill amount' },
          tipPercent: { type: 'number', description: 'Tip percentage (default 15)' },
          split: { type: 'number', description: 'Number of people to split (default 1)' },
        },
        required: ['amount'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.amount || params.amount <= 0) throw new Error('amount required and must be > 0');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { amount, tipPercent = 15, split = 1 } = params;

      if (split < 1) throw new Error('split must be >= 1');

      const tipAmount = amount * (tipPercent / 100);
      const total = amount + tipAmount;
      const perPerson = total / split;

      return {
        amount,
        tipPercent,
        tipAmount: Math.round(tipAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        split,
        perPerson: Math.round(perPerson * 100) / 100,
      };
    } catch (e) {
      logger.error(`TipCalcTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TipCalcTool;
