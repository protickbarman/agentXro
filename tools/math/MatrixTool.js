const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class MatrixTool extends Tool {
  constructor() {
    super('matrix_ops', {
      description: 'Perform matrix operations: add, multiply, transpose, determinant, inverse',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['add', 'multiply', 'transpose', 'determinant', 'inverse'], description: 'Matrix operation' },
          matrixA: { type: 'string', description: 'JSON string of first matrix (array of arrays of numbers)' },
          matrixB: { type: 'string', description: 'JSON string of second matrix (array of arrays of numbers) for add/multiply' },
        },
        required: ['operation', 'matrixA'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    try {
      params.matrixA = typeof params.matrixA === 'string' ? JSON.parse(params.matrixA) : params.matrixA;
    } catch (e) {
      throw new Error('matrixA must be a valid JSON string');
    }
    if (!Array.isArray(params.matrixA) || params.matrixA.length === 0) {
      throw new Error('matrixA must be a non-empty array');
    }
    const cols = params.matrixA[0].length;
    for (const row of params.matrixA) {
      if (!Array.isArray(row) || row.length !== cols) {
        throw new Error('matrixA must have consistent dimensions');
      }
      if (!row.every(v => typeof v === 'number' && isFinite(v))) {
        throw new Error('All matrix entries must be finite numbers');
      }
    }
    if (params.matrixB) {
      try {
        params.matrixB = typeof params.matrixB === 'string' ? JSON.parse(params.matrixB) : params.matrixB;
      } catch (e) {
        throw new Error('matrixB must be a valid JSON string');
      }
    }
    return true;
  }

  validateSquare(matrix) {
    const n = matrix.length;
    if (n === 0 || matrix[0].length !== n) {
      throw new Error('Matrix must be square for this operation');
    }
  }

  clone(m) {
    return m.map(r => [...r]);
  }

  determinant(m) {
    this.validateSquare(m);
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      const sub = m.slice(1).map(r => r.filter((_, idx) => idx !== j));
      det += (j % 2 === 0 ? 1 : -1) * m[0][j] * this.determinant(sub);
    }
    return det;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { operation, matrixA, matrixB } = params;

      switch (operation) {
        case 'add': {
          if (!matrixB) throw new Error('matrixB required for addition');
          if (matrixA.length !== matrixB.length || matrixA[0].length !== matrixB[0].length) {
            throw new Error('Matrices must have same dimensions for addition');
          }
          const result = matrixA.map((row, i) => row.map((v, j) => v + matrixB[i][j]));
          return { operation, result };
        }
        case 'multiply': {
          if (!matrixB) throw new Error('matrixB required for multiplication');
          const aCols = matrixA[0].length;
          const bRows = matrixB.length;
          if (aCols !== bRows) throw new Error('Matrix dimensions incompatible for multiplication');
          const bCols = matrixB[0].length;
          const result = Array.from({ length: matrixA.length }, () => new Array(bCols).fill(0));
          for (let i = 0; i < matrixA.length; i++) {
            for (let j = 0; j < bCols; j++) {
              for (let k = 0; k < aCols; k++) {
                result[i][j] += matrixA[i][k] * matrixB[k][j];
              }
            }
          }
          return { operation, result };
        }
        case 'transpose': {
          const rows = matrixA.length, cols = matrixA[0].length;
          const result = Array.from({ length: cols }, (_, j) => Array.from({ length: rows }, (_, i) => matrixA[i][j]));
          return { operation, result };
        }
        case 'determinant': {
          const det = this.determinant(matrixA);
          return { operation, determinant: det };
        }
        case 'inverse': {
          this.validateSquare(matrixA);
          const n = matrixA.length;
          const det = this.determinant(matrixA);
          if (det === 0) throw new Error('Matrix is singular, cannot invert');
          const adj = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => {
              const sub = matrixA.filter((_, r) => r !== i).map(r => r.filter((_, c) => c !== j));
              return ((i + j) % 2 === 0 ? 1 : -1) * this.determinant(sub);
            })
          );
          const result = adj.map(r => r.map(v => v / det));
          return { operation, result };
        }
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      logger.error(`Matrix execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MatrixTool;
