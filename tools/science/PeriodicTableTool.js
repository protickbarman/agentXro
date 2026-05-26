const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const ELEMENTS = [
  { name: 'Hydrogen', symbol: 'H', number: 1, mass: 1.008, group: 1, period: 1 },
  { name: 'Helium', symbol: 'He', number: 2, mass: 4.003, group: 18, period: 1 },
  { name: 'Lithium', symbol: 'Li', number: 3, mass: 6.941, group: 1, period: 2 },
  { name: 'Beryllium', symbol: 'Be', number: 4, mass: 9.012, group: 2, period: 2 },
  { name: 'Boron', symbol: 'B', number: 5, mass: 10.811, group: 13, period: 2 },
  { name: 'Carbon', symbol: 'C', number: 6, mass: 12.011, group: 14, period: 2 },
  { name: 'Nitrogen', symbol: 'N', number: 7, mass: 14.007, group: 15, period: 2 },
  { name: 'Oxygen', symbol: 'O', number: 8, mass: 15.999, group: 16, period: 2 },
  { name: 'Fluorine', symbol: 'F', number: 9, mass: 18.998, group: 17, period: 2 },
  { name: 'Neon', symbol: 'Ne', number: 10, mass: 20.180, group: 18, period: 2 },
  { name: 'Sodium', symbol: 'Na', number: 11, mass: 22.990, group: 1, period: 3 },
  { name: 'Magnesium', symbol: 'Mg', number: 12, mass: 24.305, group: 2, period: 3 },
  { name: 'Aluminum', symbol: 'Al', number: 13, mass: 26.982, group: 13, period: 3 },
  { name: 'Silicon', symbol: 'Si', number: 14, mass: 28.086, group: 14, period: 3 },
  { name: 'Phosphorus', symbol: 'P', number: 15, mass: 30.974, group: 15, period: 3 },
  { name: 'Sulfur', symbol: 'S', number: 16, mass: 32.065, group: 16, period: 3 },
  { name: 'Chlorine', symbol: 'Cl', number: 17, mass: 35.453, group: 17, period: 3 },
  { name: 'Argon', symbol: 'Ar', number: 18, mass: 39.948, group: 18, period: 3 },
  { name: 'Potassium', symbol: 'K', number: 19, mass: 39.098, group: 1, period: 4 },
  { name: 'Calcium', symbol: 'Ca', number: 20, mass: 40.078, group: 2, period: 4 },
  { name: 'Iron', symbol: 'Fe', number: 26, mass: 55.845, group: 8, period: 4 },
  { name: 'Copper', symbol: 'Cu', number: 29, mass: 63.546, group: 11, period: 4 },
  { name: 'Zinc', symbol: 'Zn', number: 30, mass: 65.380, group: 12, period: 4 },
  { name: 'Silver', symbol: 'Ag', number: 47, mass: 107.868, group: 11, period: 5 },
  { name: 'Gold', symbol: 'Au', number: 79, mass: 196.967, group: 11, period: 6 },
  { name: 'Mercury', symbol: 'Hg', number: 80, mass: 200.590, group: 12, period: 6 },
  { name: 'Lead', symbol: 'Pb', number: 82, mass: 207.200, group: 14, period: 6 },
];

class PeriodicTableTool extends Tool {
  constructor() {
    super('periodic_table', {
      description: 'Look up element by name, symbol, or atomic number',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Element name, symbol, or atomic number' },
        },
        required: ['query'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.query) throw new Error('query required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const q = String(params.query).trim();
      const num = Number(q);
      let element;
      if (!isNaN(num)) {
        element = ELEMENTS.find(e => e.number === num);
      } else {
        element = ELEMENTS.find(e =>
          e.symbol.toLowerCase() === q.toLowerCase() ||
          e.name.toLowerCase() === q.toLowerCase()
        );
      }
      if (!element) throw new Error(`Element not found: ${q}`);
      return { ...element };
    } catch (e) {
      logger.error(`PeriodicTableTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = PeriodicTableTool;
