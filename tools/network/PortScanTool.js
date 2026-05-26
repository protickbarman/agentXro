const Tool = require('../base/Tool');
const net = require('net');
const logger = require('../../config/logger');

class PortScanTool extends Tool {
  constructor() {
    super('port_scan', {
      description: 'Check if a TCP port is open on a host',
      parameters: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hostname or IP address' },
          port: { type: 'number', description: 'TCP port to check' },
          timeout: { type: 'number', description: 'Timeout in milliseconds' },
        },
        required: ['host', 'port'],
      },
    });
    this.timeout = 15000;
  }

  validate(params) {
    if (!params.host) throw new Error('host required');
    if (!params.port) throw new Error('port required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { host, port, timeout = 3000 } = params;
      const open = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
      });
      return { host, port, open, service: open ? getServiceName(port) : null };
    } catch (e) {
      logger.error(`PortScanTool error: ${e.message}`);
      throw e;
    }
  }
}

function getServiceName(port) {
  const services = {
    20: 'FTP-data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
    53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
    465: 'SMTPS', 587: 'SMTP-submission', 993: 'IMAPS', 995: 'POP3S',
    3306: 'MySQL', 5432: 'PostgreSQL', 6379: 'Redis', 8080: 'HTTP-alt',
    27017: 'MongoDB',
  };
  return services[port] || 'unknown';
}

module.exports = PortScanTool;
