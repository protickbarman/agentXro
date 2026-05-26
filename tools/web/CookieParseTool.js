const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class CookieParseTool extends Tool {
  constructor() {
    super('cookie_parse', {
      description: 'Parse cookie string to object or stringify object to cookie string',
      parameters: {
        type: 'object',
        properties: {
          cookies: { type: 'string', description: 'Cookie string to parse or cookie object to stringify' },
          direction: { type: 'string', enum: ['parse', 'stringify'], description: 'Parse or stringify direction' },
        },
        required: ['cookies', 'direction'],
      },
    });
  }

  validate(p) {
    if (p.cookies === undefined) throw new Error('cookies is required');
    if (!['parse', 'stringify'].includes(p.direction)) throw new Error('direction must be "parse" or "stringify"');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      if (p.direction === 'parse') {
        const obj = {};
        if (typeof p.cookies === 'string') {
          p.cookies.split(';').forEach(pair => {
            const [k, ...v] = pair.split('=');
            if (k) obj[k.trim()] = decodeURIComponent(v.join('=').trim());
          });
        }
        return this.formatResult({ cookies: obj, count: Object.keys(obj).length });
      } else {
        if (typeof p.cookies !== 'object' || Array.isArray(p.cookies))
          throw new Error('cookies must be an object for stringify');
        const str = Object.entries(p.cookies)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('; ');
        return this.formatResult({ cookieString: str, count: Object.keys(p.cookies).length });
      }
    } catch (e) {
      logger.error(`CookieParseTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = CookieParseTool;
