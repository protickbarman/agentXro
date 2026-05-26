const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const STATUS_CODES = {
  100: { category: 'Informational', phrase: 'Continue' },
  101: { category: 'Informational', phrase: 'Switching Protocols' },
  200: { category: 'Success', phrase: 'OK' },
  201: { category: 'Success', phrase: 'Created' },
  202: { category: 'Success', phrase: 'Accepted' },
  203: { category: 'Success', phrase: 'Non-Authoritative Information' },
  204: { category: 'Success', phrase: 'No Content' },
  205: { category: 'Success', phrase: 'Reset Content' },
  206: { category: 'Success', phrase: 'Partial Content' },
  300: { category: 'Redirection', phrase: 'Multiple Choices' },
  301: { category: 'Redirection', phrase: 'Moved Permanently' },
  302: { category: 'Redirection', phrase: 'Found' },
  303: { category: 'Redirection', phrase: 'See Other' },
  304: { category: 'Redirection', phrase: 'Not Modified' },
  307: { category: 'Redirection', phrase: 'Temporary Redirect' },
  308: { category: 'Redirection', phrase: 'Permanent Redirect' },
  400: { category: 'Client Error', phrase: 'Bad Request' },
  401: { category: 'Client Error', phrase: 'Unauthorized' },
  402: { category: 'Client Error', phrase: 'Payment Required' },
  403: { category: 'Client Error', phrase: 'Forbidden' },
  404: { category: 'Client Error', phrase: 'Not Found' },
  405: { category: 'Client Error', phrase: 'Method Not Allowed' },
  406: { category: 'Client Error', phrase: 'Not Acceptable' },
  407: { category: 'Client Error', phrase: 'Proxy Authentication Required' },
  408: { category: 'Client Error', phrase: 'Request Timeout' },
  409: { category: 'Client Error', phrase: 'Conflict' },
  410: { category: 'Client Error', phrase: 'Gone' },
  411: { category: 'Client Error', phrase: 'Length Required' },
  412: { category: 'Client Error', phrase: 'Precondition Failed' },
  413: { category: 'Client Error', phrase: 'Payload Too Large' },
  414: { category: 'Client Error', phrase: 'URI Too Long' },
  415: { category: 'Client Error', phrase: 'Unsupported Media Type' },
  416: { category: 'Client Error', phrase: 'Range Not Satisfiable' },
  417: { category: 'Client Error', phrase: 'Expectation Failed' },
  418: { category: 'Client Error', phrase: "I'm a Teapot" },
  422: { category: 'Client Error', phrase: 'Unprocessable Entity' },
  425: { category: 'Client Error', phrase: 'Too Early' },
  426: { category: 'Client Error', phrase: 'Upgrade Required' },
  429: { category: 'Client Error', phrase: 'Too Many Requests' },
  431: { category: 'Client Error', phrase: 'Request Header Fields Too Large' },
  451: { category: 'Client Error', phrase: 'Unavailable For Legal Reasons' },
  500: { category: 'Server Error', phrase: 'Internal Server Error' },
  501: { category: 'Server Error', phrase: 'Not Implemented' },
  502: { category: 'Server Error', phrase: 'Bad Gateway' },
  503: { category: 'Server Error', phrase: 'Service Unavailable' },
  504: { category: 'Server Error', phrase: 'Gateway Timeout' },
  505: { category: 'Server Error', phrase: 'HTTP Version Not Supported' },
  511: { category: 'Server Error', phrase: 'Network Authentication Required' },
};

class HttpStatusTool extends Tool {
  constructor() {
    super('http_status', {
      description: 'Look up the meaning of an HTTP status code',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'number', description: 'HTTP status code' },
        },
        required: ['code'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (params.code === undefined || params.code === null) throw new Error('code required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { code } = params;
      const info = STATUS_CODES[code];
      if (!info) return { code, found: false, message: 'Unknown status code' };
      return { code, found: true, category: info.category, phrase: info.phrase, full: `${code} ${info.phrase}` };
    } catch (e) {
      logger.error(`HttpStatusTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = HttpStatusTool;
