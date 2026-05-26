const Tool = require('../base/Tool');
const crypto = require('crypto');
const logger = require('../../config/logger');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

class PasswordGenTool extends Tool {
  constructor() {
    super('password_gen', {
      description: 'Generate strong password',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Password length' },
          useUppercase: { type: 'boolean', description: 'Include uppercase letters' },
          useLowercase: { type: 'boolean', description: 'Include lowercase letters' },
          useDigits: { type: 'boolean', description: 'Include digits' },
          useSymbols: { type: 'boolean', description: 'Include symbols' },
          count: { type: 'number', description: 'Number of passwords to generate' },
        },
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    return true;
  }

  _generate(length, uppercase, lowercase, digits, symbols) {
    let chars = '';
    const mandatory = [];

    if (uppercase) { chars += UPPERCASE; mandatory.push(UPPERCASE[crypto.randomInt(UPPERCASE.length)]); }
    if (lowercase) { chars += LOWERCASE; mandatory.push(LOWERCASE[crypto.randomInt(LOWERCASE.length)]); }
    if (digits) { chars += DIGITS; mandatory.push(DIGITS[crypto.randomInt(DIGITS.length)]); }
    if (symbols) { chars += SYMBOLS; mandatory.push(SYMBOLS[crypto.randomInt(SYMBOLS.length)]); }

    if (!chars) chars = LOWERCASE;

    const remaining = length - mandatory.length;
    const bytes = crypto.randomBytes(Math.max(remaining, 0));
    let password = '';
    for (let i = 0; i < Math.max(remaining, 0); i++) {
      password += chars[bytes[i] % chars.length];
    }
    password += mandatory.join('');

    const pwdArr = password.split('');
    for (let i = pwdArr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [pwdArr[i], pwdArr[j]] = [pwdArr[j], pwdArr[i]];
    }
    return pwdArr.join('');
  }

  async execute(params) {
    try {
      this.validate(params);
      const {
        length = 16,
        useUppercase = true,
        useLowercase = true,
        useDigits = true,
        useSymbols = true,
        count = 1,
      } = params;

      const passwords = [];
      for (let i = 0; i < count; i++) {
        passwords.push(this._generate(length, useUppercase, useLowercase, useDigits, useSymbols));
      }
      return { length, count, passwords: count === 1 ? passwords[0] : passwords };
    } catch (e) {
      logger.error(`PasswordGenTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = PasswordGenTool;
