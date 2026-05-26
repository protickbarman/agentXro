const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const PALETTES = {
  material: ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#FFB3E6', '#B3FFE6', '#B3D9FF', '#FFB3B3', '#FFD9B3', '#FFFFB3'],
  ocean: ['#006994', '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF', '#ADE8F4', '#CAF0F8', '#023E8A', '#03045E'],
  forest: ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC'],
  sunset: ['#FF6B35', '#F7C59F', '#EFEFD0', '#004E89', '#1A659E', '#FF4B2B', '#FF416C', '#FF6B6B'],
  neon: ['#FF00FF', '#00FF00', '#FF0', '#0FF', '#F0F', '#0F0', '#FF0', '#0FF'],
  monokai: ['#F92672', '#A6E22E', '#FD971F', '#66D9EF', '#AE81FF', '#E6DB74', '#F8F8F2', '#75715E'],
  dracula: ['#FF5555', '#50FA7B', '#F1FA8C', '#BD93F9', '#FF79C6', '#8BE9FD', '#6272A4', '#F8F8F2'],
};

class ColorPaletteTool extends Tool {
  constructor() {
    super('color_palette', {
      description: 'Return common color palettes by name',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Palette name (material, pastel, ocean, forest, sunset, neon, monokai, dracula)' },
          count: { type: 'number', description: 'Number of colors to return' },
        },
      },
    });
  }

  validate(p) {
    return true;
  }

  execute(p) {
    try {
      this.validate(p);
      const paletteNames = Object.keys(PALETTES);
      if (p.name) {
        const name = p.name.toLowerCase();
        const colors = PALETTES[name];
        if (!colors) return this.formatResult({ error: `Unknown palette "${name}". Available: ${paletteNames.join(', ')}`, available: paletteNames });
        const count = p.count || colors.length;
        return this.formatResult({ name, colors: colors.slice(0, count), total: colors.length });
      }
      const result = {};
      for (const [name, colors] of Object.entries(PALETTES)) {
        result[name] = p.count ? colors.slice(0, p.count) : colors;
      }
      return this.formatResult({ palettes: result, available: paletteNames, count: paletteNames.length });
    } catch (e) {
      logger.error(`ColorPaletteTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = ColorPaletteTool;
