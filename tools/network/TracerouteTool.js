const Tool = require('../base/Tool');
const dgram = require('dgram');
const logger = require('../../config/logger');

class TracerouteTool extends Tool {
  constructor() {
    super('traceroute', {
      description: 'Traceroute simulation using UDP with increasing TTL',
      parameters: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Target hostname or IP' },
          maxHops: { type: 'number', description: 'Maximum number of hops (default 30)' },
        },
        required: ['host'],
      },
    });
    this.timeout = 60000;
  }

  validate(params) {
    if (!params.host) throw new Error('host required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { host, maxHops = 30 } = params;
      const hops = [];
      for (let ttl = 1; ttl <= maxHops; ttl++) {
        const hop = await this.traceHop(host, ttl);
        hops.push(hop);
        if (hop.reached) break;
      }
      return { host, hops, totalHops: hops.length, reached: hops.some(h => h.reached) };
    } catch (e) {
      logger.error(`TracerouteTool error: ${e.message}`);
      throw e;
    }
  }

  traceHop(host, ttl) {
    return new Promise((resolve) => {
      const sock = dgram.createSocket('udp4');
      const start = Date.now();
      let responded = false;
      sock.on('message', (msg, rinfo) => {
        responded = true;
        const latency = Date.now() - start;
        sock.close();
        resolve({ hop: ttl, ip: rinfo.address, latency: `${latency}ms`, reached: rinfo.address === host });
      });
      sock.on('error', () => {
        if (!responded) { sock.close(); resolve({ hop: ttl, ip: '*', latency: 'N/A', reached: false }); }
      });
      sock.on('timeout', () => {
        if (!responded) { sock.close(); resolve({ hop: ttl, ip: '*', latency: 'Timeout', reached: false }); }
      });
      try {
        sock.setTTL(ttl);
        sock.send(Buffer.from(''), 0, 0, 33434 + ttl, host, (err) => {
          if (err) { sock.close(); resolve({ hop: ttl, ip: '*', latency: 'Error', reached: false }); }
        });
        setTimeout(() => {
          if (!responded) { sock.close(); resolve({ hop: ttl, ip: '*', latency: 'Timeout', reached: false }); }
        }, 3000);
      } catch (e) {
        sock.close();
        resolve({ hop: ttl, ip: '*', latency: 'Error', reached: false });
      }
    });
  }
}

module.exports = TracerouteTool;
