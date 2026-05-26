const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class TaxCalcTool extends Tool {
  constructor() {
    super('tax_calc', {
      description: 'Progressive tax bracket calculation',
      parameters: {
        type: 'object',
        properties: {
          income: { type: 'number', description: 'Taxable income' },
          brackets: { type: 'array', description: 'Tax brackets [{min,max,rate}]' },
        },
        required: ['income', 'brackets'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.income === undefined || params.income < 0) throw new Error('income required and must be >= 0');
    if (!Array.isArray(params.brackets) || params.brackets.length === 0) throw new Error('brackets required and must be a non-empty array');
    for (const b of params.brackets) {
      if (b.min === undefined || b.rate === undefined) throw new Error('Each bracket must have min and rate');
    }
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { income, brackets } = params;
      const sorted = [...brackets].sort((a, b) => a.min - b.min);
      let totalTax = 0;
      const breakdown = [];

      for (let i = 0; i < sorted.length; i++) {
        const { min, max = Infinity, rate } = sorted[i];
        const bracketMax = Math.min(max, income);
        if (income > min) {
          const taxable = bracketMax - min;
          const tax = taxable * (rate / 100);
          totalTax += tax;
          breakdown.push({ min, max: bracketMax, rate, taxable, tax: Math.round(tax * 100) / 100 });
        }
        if (income <= max) break;
      }

      const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
      return {
        income,
        totalTax: Math.round(totalTax * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 100) / 100,
        breakdown,
      };
    } catch (e) {
      logger.error(`TaxCalcTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = TaxCalcTool;
