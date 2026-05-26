const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.', ' ': '/',
};

const REVERSE_MAP = {};
for (const [k, v] of Object.entries(MORSE_MAP)) {
  REVERSE_MAP[v] = k;
}

class MorseCodeTool extends Tool {
  constructor() {
    super('morse_code', {
      description: 'Encode/decode morse code',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to encode or decode' },
          direction: { type: 'string', enum: ['encode', 'decode'], description: 'Direction' },
        },
        required: ['text', 'direction'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.text) throw new Error('text required');
    if (!params.direction) throw new Error('direction required');
    if (!['encode', 'decode'].includes(params.direction)) throw new Error('Invalid direction');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { text, direction } = params;

      if (direction === 'encode') {
        const result = text.toUpperCase().split('').map(ch => MORSE_MAP[ch] || ch).join(' ');
        return { direction, input: text, output: result };
      } else {
        const result = text.split(' ').map(code => REVERSE_MAP[code] || code).join('');
        return { direction, input: text, output: result };
      }
    } catch (e) {
      logger.error(`MorseCodeTool failed: ${e.message}`);
      throw e;
    }
  }
}

module.exports = MorseCodeTool;
