const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const OUI_TABLE = {
  '00:00:0C': 'Cisco Systems',
  '00:01:42': 'Cisco Systems',
  '00:05:5D': 'Cisco Systems',
  '00:0C:29': 'VMware',
  '00:50:56': 'VMware',
  '00:15:5D': 'Microsoft',
  '00:03:FF': 'Microsoft',
  '00:1A:A0': 'Hewlett-Packard',
  '00:1B:63': 'Hewlett-Packard',
  '00:1E:0B': 'Hewlett-Packard',
  '00:21:5A': 'Hewlett-Packard',
  '00:0A:E4': 'IBM',
  '00:14:5E': 'IBM',
  '00:1A:64': 'IBM',
  '00:23:9E': 'IBM',
  '00:17:31': 'Apple',
  '00:1E:C2': 'Apple',
  '00:1F:5B': 'Apple',
  '00:1F:F3': 'Apple',
  '00:23:32': 'Apple',
  '00:25:00': 'Apple',
  '00:25:BC': 'Apple',
  '00:26:08': 'Apple',
  '00:26:4A': 'Apple',
  '00:26:B0': 'Apple',
  '00:30:65': 'Apple',
  '00:3E:E1': 'Apple',
  '08:00:27': 'Oracle VirtualBox',
  '08:00:46': 'Intel',
  '00:1B:21': 'Intel',
  '00:1E:67': 'Intel',
  '00:21:6A': 'Intel',
  '00:26:AB': 'Intel',
  '00:1A:92': 'Dell',
  '00:21:70': 'Dell',
  '00:23:AE': 'Dell',
  '00:26:B9': 'Dell',
  '00:14:22': 'Dell',
  '00:0F:1F': 'Dell',
  '00:14:A8': 'ASUS',
  '00:1B:FC': 'ASUS',
  '00:22:15': 'ASUS',
  '00:24:8C': 'ASUS',
  '00:26:18': 'ASUS',
  '00:12:17': 'Samsung',
  '00:16:20': 'Samsung',
  '00:1E:5F': 'Samsung',
  '00:23:D4': 'Samsung',
  '00:24:2B': 'Samsung',
  '00:11:22': 'Samsung',
  '00:0D:5E': 'Huawei',
  '00:18:82': 'Huawei',
  '00:25:9E': 'Huawei',
  '00:1A:2B': 'Huawei',
  '00:0E:07': 'Xerox',
  '00:14:BF': 'Xerox',
  '00:08:5C': 'Xerox',
  '00:80:64': 'Xerox',
  'F0:4D:A2': 'Google',
  'A4:77:33': 'Google',
  '8C:DE:F9': 'Google',
  '00:1A:11': 'Google',
  'F8:CA:B8': 'Google',
  '34:DA:7D': 'Nest Labs',
  '18:B4:30': 'Nest Labs',
  '00:AA:00': 'Intel',
  '00:DD:00': 'Uniden',
  '00:E0:4C': 'Realtek',
  '00:E0:98': 'Realtek',
  '00:0B:AB': 'Juniper',
  '00:12:7F': 'Juniper',
  '00:19:E2': 'Juniper',
  '00:1F:12': 'Juniper',
  '00:23:9C': 'Juniper',
  '00:05:86': 'Juniper',
};

class MacLookupTool extends Tool {
  constructor() {
    super('mac_lookup', {
      description: 'Look up MAC address vendor using the OUI table',
      parameters: {
        type: 'object',
        properties: {
          mac: { type: 'string', description: 'MAC address (e.g. 00:1A:2B:3C:4D:5E)' },
        },
        required: ['mac'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.mac) throw new Error('mac required');
    return true;
  }

  formatMac(mac) {
    const clean = mac.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (clean.length !== 12) throw new Error('Invalid MAC address length');
    return clean.match(/.{2}/g).join(':');
  }

  async execute(params) {
    try {
      this.validate(params);
      const { mac } = params;
      const formatted = this.formatMac(mac);
      const oui = formatted.substring(0, 8);
      const vendor = OUI_TABLE[oui] || 'Unknown';
      return { mac: formatted, oui, vendor, inTable: vendor !== 'Unknown' };
    } catch (e) {
      logger.error(`MacLookupTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = MacLookupTool;
