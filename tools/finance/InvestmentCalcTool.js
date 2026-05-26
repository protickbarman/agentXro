const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class InvestmentCalcTool extends Tool {
  constructor() {
    super('investment_calc', {
      description: 'ROI, CAGR, future value calculation',
      parameters: {
        type: 'object',
        properties: {
          presentValue: { type: 'number', description: 'Present value / initial investment' },
          rate: { type: 'number', description: 'Rate of return (percentage)' },
          periods: { type: 'number', description: 'Number of periods (years)' },
          op: { type: 'string', enum: ['future_value', 'roi', 'cagr'], description: 'Calculation type' },
        },
        required: ['presentValue', 'rate', 'periods'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.presentValue || params.presentValue <= 0) throw new Error('presentValue required and must be > 0');
    if (params.rate === undefined) throw new Error('rate required');
    if (!params.periods || params.periods <= 0) throw new Error('periods required and must be > 0');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { presentValue, rate, periods, op = 'future_value' } = params;
      const r = rate / 100;

      switch (op) {
        case 'future_value': {
          const fv = presentValue * Math.pow(1 + r, periods);
          const totalReturn = fv - presentValue;
          return {
            presentValue,
            rate,
            periods,
            futureValue: Math.round(fv * 100) / 100,
            totalReturn: Math.round(totalReturn * 100) / 100,
            totalReturnPercent: Math.round((totalReturn / presentValue) * 100 * 100) / 100,
          };
        }
        case 'roi': {
          const fv = presentValue * Math.pow(1 + r, periods);
          const roi = ((fv - presentValue) / presentValue) * 100;
          return {
            presentValue,
            rate,
            periods,
            futureValue: Math.round(fv * 100) / 100,
            roi: Math.round(roi * 100) / 100,
          };
        }
        case 'cagr': {
          const fv = presentValue * Math.pow(1 + r, periods);
          const cagr = (Math.pow(fv / presentValue, 1 / periods) - 1) * 100;
          return {
            presentValue,
            rate,
            periods,
            futureValue: Math.round(fv * 100) / 100,
            cagr: Math.round(cagr * 100) / 100,
          };
        }
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (e) {
      logger.error(`InvestmentCalcTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = InvestmentCalcTool;
