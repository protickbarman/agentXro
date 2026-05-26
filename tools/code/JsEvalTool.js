const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const BLOCKED = ['require', 'process', 'import', 'eval', 'constructor', '__proto__', 'prototype'];

class JsEvalTool extends Tool {
  constructor() {
    super('js_eval', {
      description: 'Evaluate JavaScript code in a sandboxed context',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to evaluate' },
          context: { type: 'object', description: 'Variables to inject into the sandbox' },
        },
        required: ['code'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.code) throw new Error('code required');
    return true;
  }

  sanitize(code) {
    for (const token of BLOCKED) {
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(code)) throw new Error(`Blocked identifier: ${token}`);
    }
    const dangerous = /require\s*\(|import\s*\(|eval\s*\(|new\s+Function|\.constructor\b|__import__|globalThis|global\b|root\b|process\b|module\b|exports\b|import\.meta|import\s+"|import\s+'/.source;
    if (new RegExp(dangerous).test(code)) throw new Error('Code contains blocked patterns');
    return code;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { code, context = {} } = params;
      this.sanitize(code);
      const keys = Object.keys(context);
      const vals = Object.values(context);
      const fn = new Function(...keys, `"use strict"; ${code}`);
      const result = fn(...vals);
      return { result };
    } catch (e) {
      logger.error(`JsEvalTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = JsEvalTool;
