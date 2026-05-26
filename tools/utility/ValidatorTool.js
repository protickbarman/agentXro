const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ValidatorTool extends Tool {
  constructor() {
    super('validator', {
      description: 'Validate email, phone, URL, IP, credit card, hex color',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Value to validate' },
          type: { type: 'string', enum: ['email', 'phone', 'url', 'ip', 'credit_card', 'hex_color'], description: 'Validation type' },
        },
        required: ['value', 'type'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.value) throw new Error('value required');
    if (!params.type) throw new Error('type required');
    return true;
  }

  _validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  _validatePhone(v) {
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(v) && v.replace(/\D/g, '').length >= 7;
  }

  _validateUrl(v) {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }

  _validateIp(v) {
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const m = v.match(ipv4);
    if (m) return m.slice(1).every(n => parseInt(n, 10) >= 0 && parseInt(n, 10) <= 255);
    const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6.test(v);
  }

  _luhnCheck(v) {
    const digits = v.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  _validateCreditCard(v) {
    return /^\d{13,19}$/.test(v.replace(/\D/g, '')) && this._luhnCheck(v);
  }

  _validateHexColor(v) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);
  }

  async execute(params) {
    try {
      this.validate(params);
      const { value, type } = params;

      let valid = false;
      switch (type) {
        case 'email': valid = this._validateEmail(value); break;
        case 'phone': valid = this._validatePhone(value); break;
        case 'url': valid = this._validateUrl(value); break;
        case 'ip': valid = this._validateIp(value); break;
        case 'credit_card': valid = this._validateCreditCard(value); break;
        case 'hex_color': valid = this._validateHexColor(value); break;
        default: throw new Error(`Unknown type: ${type}`);
      }
      return { value, type, valid };
    } catch (e) {
      logger.error(`ValidatorTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ValidatorTool;
