const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CompoundInterestTool extends Tool {
  constructor() {
    super('compound_interest', {
      description: 'Compound interest calculation A = P(1+r/n)^(nt)',
      parameters: {
        type: 'object',
        properties: {
          principal: { type: 'number', description: 'Principal amount' },
          rate: { type: 'number', description: 'Annual interest rate (percentage)' },
          periods: { type: 'number', description: 'Number of time periods (years)' },
          compoundPerYear: { type: 'number', description: 'Times compounded per year (default 12)' },
        },
        required: ['principal', 'rate', 'periods'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.principal || params.principal <= 0) throw new Error('principal required and must be > 0');
    if (params.rate === undefined || params.rate < 0) throw new Error('rate required');
    if (!params.periods || params.periods <= 0) throw new Error('periods required and must be > 0');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { principal, rate, periods, compoundPerYear = 12 } = params;
      const r = rate / 100;
      const n = compoundPerYear;
      const t = periods;

      const amount = principal * Math.pow(1 + r / n, n * t);
      const interest = amount - principal;

      return {
        principal,
        rate,
        periods,
        compoundPerYear: n,
        futureValue: Math.round(amount * 100) / 100,
        interestEarned: Math.round(interest * 100) / 100,
      };
    } catch (e) {
      logger.error(`CompoundInterestTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = CompoundInterestTool;
