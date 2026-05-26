const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class LoanCalcTool extends Tool {
  constructor() {
    super('loan_calc', {
      description: 'Amortization schedule (monthly payment, total interest)',
      parameters: {
        type: 'object',
        properties: {
          principal: { type: 'number', description: 'Loan principal amount' },
          rate: { type: 'number', description: 'Annual interest rate (percentage)' },
          years: { type: 'number', description: 'Loan term in years' },
        },
        required: ['principal', 'rate', 'years'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.principal || params.principal <= 0) throw new Error('principal required and must be > 0');
    if (params.rate === undefined || params.rate < 0) throw new Error('rate required');
    if (!params.years || params.years <= 0) throw new Error('years required and must be > 0');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { principal, rate, years } = params;
      const monthlyRate = (rate / 100) / 12;
      const numPayments = years * 12;

      let monthlyPayment;
      if (monthlyRate === 0) {
        monthlyPayment = principal / numPayments;
      } else {
        monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }

      const totalPaid = monthlyPayment * numPayments;
      const totalInterest = totalPaid - principal;

      return {
        principal,
        rate,
        years,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        numPayments,
      };
    } catch (e) {
      logger.error(`LoanCalcTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = LoanCalcTool;
