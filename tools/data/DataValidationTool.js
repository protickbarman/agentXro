const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class DataValidationTool extends Tool {
  constructor() {
    super('data_validate', {
      description: 'Validate data against a set of rules',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Data object to validate' },
          rules: { type: 'object', description: 'Validation rules: {field: {type, required, min, max, pattern}}' },
        },
        required: ['data', 'rules'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.data) throw new Error('data required');
    if (!params.rules) throw new Error('rules required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { data, rules } = params;
      const errors = [];

      for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }
        if (value === undefined || value === null) continue;
        if (rule.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rule.type) {
            errors.push(`${field} must be of type ${rule.type}, got ${actualType}`);
          }
        }
        if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
          errors.push(`${field} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
          errors.push(`${field} must be <= ${rule.max}`);
        }
        if (rule.pattern && typeof value === 'string') {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            errors.push(`${field} does not match pattern ${rule.pattern}`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (e) {
      logger.error('DataValidationTool execution failed', { error: e.message });
      throw e;
    }
  }
}

module.exports = DataValidationTool;
