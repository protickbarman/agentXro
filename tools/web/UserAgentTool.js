const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class UserAgentTool extends Tool {
  constructor() {
    super('user_agent', {
      description: 'Parse user agent string to extract browser, OS, and device info',
      parameters: {
        type: 'object',
        properties: {
          ua: { type: 'string', description: 'User agent string' },
        },
        required: ['ua'],
      },
    });
  }

  validate(p) {
    if (!p.ua || typeof p.ua !== 'string') throw new Error('ua is required and must be a string');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const ua = p.ua;
      let browser = 'Unknown', version = '', os = 'Unknown', device = 'Desktop';

      if (/Edg\/(\S+)/i.test(ua)) { browser = 'Edge'; version = RegExp.$1; }
      else if (/Firefox\/(\S+)/i.test(ua)) { browser = 'Firefox'; version = RegExp.$1; }
      else if (/Chrome\/(\S+)/i.test(ua) && !/Edg\/|OPR\//i.test(ua)) { browser = 'Chrome'; version = RegExp.$1; }
      else if (/Safari\/(\S+)/i.test(ua) && !/Chrome/i.test(ua)) { browser = 'Safari'; version = RegExp.$1; }
      else if (/OPR\/(\S+)/i.test(ua)) { browser = 'Opera'; version = RegExp.$1; }
      else if (/MSIE (\S+)/i.test(ua) || /Trident.*rv:(\S+)/i.test(ua)) { browser = 'Internet Explorer'; version = RegExp.$1; }

      if (/Windows NT (\S+)/i.test(ua)) { os = 'Windows'; }
      else if (/Mac OS X (\S+)/i.test(ua)) { os = 'macOS'; }
      else if (/Android (\S+)/i.test(ua)) { os = 'Android'; }
      else if (/iOS|iPhone OS (\S+)/i.test(ua)) { os = 'iOS'; }
      else if (/Linux/i.test(ua) && !/Android/i.test(ua)) { os = 'Linux'; }
      else if (/CrOS/i.test(ua)) { os = 'ChromeOS'; }

      if (/Mobile|Android|iPhone|iPod|BlackBerry/i.test(ua)) device = 'Mobile';
      else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

      return this.formatResult({ browser, version, os, device, ua });
    } catch (e) {
      logger.error(`UserAgentTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = UserAgentTool;
