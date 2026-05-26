const Tool = require('../base/Tool');
const logger = require('../../config/logger');

const ATOMIC_MASSES = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.811,
  C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.086, P: 30.974,
  S: 32.065, Cl: 35.453, Ar: 39.948, K: 39.098, Ca: 40.078,
  Fe: 55.845, Cu: 63.546, Zn: 65.380, Ag: 107.868, Au: 196.967,
  Hg: 200.590, Pb: 207.200, Mn: 54.938, Cr: 51.996, Ni: 58.693,
  Sn: 118.710, I: 126.904, Ba: 137.327, Pt: 195.084,
};

function parseFormula(formula) {
  const regex = /([A-Z][a-z]*)(\d*)/g;
  const counts = {};
  let match;
  while ((match = regex.exec(formula)) !== null) {
    const element = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    counts[element] = (counts[element] || 0) + count;
  }
  return counts;
}

function calcWeight(counts) {
  let total = 0;
  for (const [el, cnt] of Object.entries(counts)) {
    if (!(el in ATOMIC_MASSES)) throw new Error(`Unknown element: ${el}`);
    total += ATOMIC_MASSES[el] * cnt;
  }
  return total;
}

class ChemicalFormulaTool extends Tool {
  constructor() {
    super('chemical_formula', {
      description: 'Parse chemical formulas, calculate molecular weight, or count elements',
      parameters: {
        type: 'object',
        properties: {
          formula: { type: 'string', description: 'Chemical formula (e.g. H2O, C6H12O6)' },
          op: { type: 'string', enum: ['parse', 'weight', 'count'], description: 'Operation to perform' },
        },
        required: ['formula'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (!params.formula) throw new Error('formula required');
    return true;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { formula, op = 'parse' } = params;
      const counts = parseFormula(formula);
      if (Object.keys(counts).length === 0) throw new Error('No elements found in formula');
      let result;
      switch (op) {
        case 'parse':
          result = { formula, elements: counts };
          break;
        case 'count':
          result = { formula, elements: counts, totalAtoms: Object.values(counts).reduce((a, b) => a + b, 0) };
          break;
        case 'weight':
          result = { formula, elements: counts, molecularWeight: calcWeight(counts) };
          break;
        default:
          result = { formula, elements: counts };
      }
      return result;
    } catch (e) {
      logger.error(`ChemicalFormulaTool error: ${e.message}`);
      throw e;
    }
  }
}

module.exports = ChemicalFormulaTool;
