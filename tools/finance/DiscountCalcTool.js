const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DiscountCalcTool extends Tool {
  constructor() {
    super('discount_calc', {
      description: 'Calculate discounts, sale price, savings',
      parameters: {
        type: 'object',
        properties: {
          originalPrice: { type: 'number', description: 'Original price' },
          discountPercent: { type: 'number', description: 'Discount percentage' },
          discountAmount: { type: 'number', description: 'Fixed discount amount' },
        },
        required: ['originalPrice'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.originalPrice || params.originalPrice <= 0) throw new Error('originalPrice required and must be > 0');
    if (!params.discountPercent && !params.discountAmount) throw new Error('discountPercent or discountAmount required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { originalPrice, discountPercent, discountAmount } = params;

      let discount;
      if (discountPercent !== undefined && discountPercent !== null) {
        discount = originalPrice * (discountPercent / 100);
      } else {
        discount = discountAmount;
      }

      const salePrice = originalPrice - discount;
      const savings = discount;
      const effectivePercent = (savings / originalPrice) * 100;

      return {
        originalPrice,
        discount: Math.round(discount * 100) / 100,
        salePrice: Math.round(Math.max(0, salePrice) * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        effectivePercent: Math.round(effectivePercent * 100) / 100,
      };
    } catch (e) {
      logger.error(`DiscountCalcTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = DiscountCalcTool;
