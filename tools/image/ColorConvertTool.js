const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ColorConvertTool extends Tool {
  constructor() {
    super('color_convert', {
      description: 'Convert colors between HEX, RGB, HSL, HSV, CMYK formats',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'Color value to convert' },
          from: { type: 'string', enum: ['hex', 'rgb', 'hsl', 'hsv', 'cmyk'], description: 'Source format' },
          to: { type: 'string', enum: ['hex', 'rgb', 'hsl', 'hsv', 'cmyk'], description: 'Target format' },
        },
        required: ['value', 'from', 'to'],
      },
    });
  }

  validate(p) {
    if (!p.value || typeof p.value !== 'string') throw new Error('value is required');
    if (!['hex', 'rgb', 'hsl', 'hsv', 'cmyk'].includes(p.from)) throw new Error('Invalid from format');
    if (!['hex', 'rgb', 'hsl', 'hsv', 'cmyk'].includes(p.to)) throw new Error('Invalid to format');
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      let rgb;
      switch (p.from) {
        case 'hex': rgb = this._hexToRgb(p.value); break;
        case 'rgb': rgb = this._parseRgb(p.value); break;
        case 'hsl': { const h = this._parseHsl(p.value); rgb = this._hslToRgb(h.h, h.s, h.l); break; }
        case 'hsv': { const h = this._parseHsv(p.value); rgb = this._hsvToRgb(h.h, h.s, h.v); break; }
        case 'cmyk': { const c = this._parseCmyk(p.value); rgb = this._cmykToRgb(c.c, c.m, c.y, c.k); break; }
        default: throw new Error('Unknown source format');
      }
      let result;
      switch (p.to) {
        case 'hex': result = this._rgbToHex(rgb.r, rgb.g, rgb.b); break;
        case 'rgb': result = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; break;
        case 'hsl': { const h = this._rgbToHsl(rgb.r, rgb.g, rgb.b); result = `hsl(${h.h}, ${h.s}%, ${h.l}%)`; break; }
        case 'hsv': { const h = this._rgbToHsv(rgb.r, rgb.g, rgb.b); result = `hsv(${h.h}, ${h.s}%, ${h.v}%)`; break; }
        case 'cmyk': { const c = this._rgbToCmyk(rgb.r, rgb.g, rgb.b); result = `cmyk(${c.c}%, ${c.m}%, ${c.y}%, ${c.k}%)`; break; }
      }
      return this.formatResult({ from: p.from, to: p.to, input: p.value, result, rgb });
    } catch (e) {
      logger.error(`ColorConvertTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }

  _hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  _parseRgb(s) {
    const m = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!m) throw new Error('Invalid RGB format');
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }

  _parseHsl(s) {
    const m = s.match(/hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
    if (!m) throw new Error('Invalid HSL format');
    return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
  }

  _parseHsv(s) {
    const m = s.match(/hsv\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
    if (!m) throw new Error('Invalid HSV format');
    return { h: parseFloat(m[1]), s: parseFloat(m[2]), v: parseFloat(m[3]) };
  }

  _parseCmyk(s) {
    const m = s.match(/cmyk\s*\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
    if (!m) throw new Error('Invalid CMYK format');
    return { c: parseFloat(m[1]), m: parseFloat(m[2]), y: parseFloat(m[3]), k: parseFloat(m[4]) };
  }

  _hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
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
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  _hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    let r1, g1, b1;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
  }

  _rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round((max === 0 ? 0 : d / max) * 100), v: Math.round(max * 100) };
  }

  _cmykToRgb(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k)),
    };
  }

  _rgbToCmyk(r, g, b) {
    const cR = r / 255, cG = g / 255, cB = b / 255;
    const k = 1 - Math.max(cR, cG, cB);
    const c = (1 - cR - k) / (1 - k) || 0;
    const m = (1 - cG - k) / (1 - k) || 0;
    const y = (1 - cB - k) / (1 - k) || 0;
    return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
  }
}

module.exports = ColorConvertTool;
