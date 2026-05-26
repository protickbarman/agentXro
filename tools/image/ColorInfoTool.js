const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ColorInfoTool extends Tool {
  constructor() {
    super('color_info', {
      description: 'Get color information: complementary, analogous, triadic colors',
      parameters: {
        type: 'object',
        properties: {
          color: { type: 'string', description: 'Color value' },
          format: { type: 'string', enum: ['hex', 'rgb'], description: 'Input color format' },
        },
        required: ['color', 'format'],
      },
    });
  }

  validate(p) {
    if (!p.color || typeof p.color !== 'string') throw new Error('color is required');
    if (!['hex', 'rgb'].includes(p.format)) throw new Error('format must be "hex" or "rgb"');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      let r, g, b;
      if (p.format === 'hex') {
        const hex = p.color.replace('#', '');
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        const m = p.color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (!m) throw new Error('Invalid RGB format');
        r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]);
      }

      const [h, s, l] = this._rgbToHsl(r, g, b);
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

      const complementary = this._hslToHex((h + 180) % 360, s, l);
      const analogous1 = this._hslToHex((h + 30) % 360, s, l);
      const analogous2 = this._hslToHex((h - 30 + 360) % 360, s, l);
      const triadic1 = this._hslToHex((h + 120) % 360, s, l);
      const triadic2 = this._hslToHex((h + 240) % 360, s, l);

      const colorNames = {
        '#FF0000': 'Red', '#00FF00': 'Lime', '#0000FF': 'Blue', '#FFFF00': 'Yellow',
        '#FF00FF': 'Magenta', '#00FFFF': 'Cyan', '#000000': 'Black', '#FFFFFF': 'White',
        '#808080': 'Gray', '#C0C0C0': 'Silver', '#800000': 'Maroon', '#808000': 'Olive',
        '#008000': 'Green', '#800080': 'Purple', '#008080': 'Teal', '#000080': 'Navy',
        '#FFA500': 'Orange', '#FFC0CB': 'Pink', '#A52A2A': 'Brown', '#F0F8FF': 'AliceBlue',
      };

      return this.formatResult({
        hex,
        rgb: `rgb(${r}, ${g}, ${b})`,
        hsl: `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`,
        name: colorNames[hex.toUpperCase()] || 'Unknown',
        complementary,
        analogous: [analogous1, analogous2],
        triadic: [triadic1, triadic2],
        luminance: Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 100) / 100,
        isLight: (0.299 * r + 0.587 * g + 0.114 * b) > 128,
      });
    } catch (e) {
      logger.error(`ColorInfoTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }

  _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }
}

module.exports = ColorInfoTool;
