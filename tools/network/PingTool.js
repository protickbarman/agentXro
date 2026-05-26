const Tool = require('../base/Tool');
const net = require('net');
const logger = require('../../config/logger');

class PingTool extends Tool {
  constructor() {
    super('ping', {
      description: 'TCP ping by connecting to a host and port',
      parameters: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hostname or IP address' },
          port: { type: 'number', description: 'TCP port' },
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
      const { host, port, timeout = 5000 } = params;
      const start = Date.now();
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => { socket.destroy(); resolve(); });
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
        socket.connect(port, host);
      });
      const latency = Date.now() - start;
      return { host, port, reachable: true, latency: `${latency}ms` };
    } catch (e) {
      return { host: params.host, port: params.port, reachable: false, error: e.message };
    }
  }
}

module.exports = PingTool;
