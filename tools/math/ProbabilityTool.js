const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class ProbabilityTool extends Tool {
  constructor() {
    super('probability', {
      description: 'Probability distributions: binomial PMF/CDF, normal PDF/CDF, Poisson PMF',
      parameters: {
        type: 'object',
        properties: {
          dist: { type: 'string', enum: ['binomial_pmf', 'binomial_cdf', 'normal_pdf', 'normal_cdf', 'poisson_pmf'], description: 'Distribution type' },
          params: { type: 'object', description: 'Distribution parameters' },
          x: { type: 'number', description: 'Point at which to evaluate' },
        },
        required: ['dist', 'params'],
      },
    });
    this.timeout = 10000;
  }

  validate(params) {
    const validDists = ['binomial_pmf', 'binomial_cdf', 'normal_pdf', 'normal_cdf', 'poisson_pmf'];
    if (!validDists.includes(params.dist)) {
      throw new Error(`dist must be one of: ${validDists.join(', ')}`);
    }
    if (typeof params.params !== 'object' || params.params === null) {
      throw new Error('params must be an object');
    }
    return true;
  }

  factorial(n) {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  combination(n, k) {
    return this.factorial(n) / (this.factorial(k) * this.factorial(n - k));
  }

  erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  normalCdf(x, mean, stddev) {
    return 0.5 * (1 + this.erf((x - mean) / (stddev * Math.sqrt(2))));
  }

  async execute(params) {
    try {
      this.validate(params);
      const { dist, params: distParams, x } = params;

      let result;
      switch (dist) {
        case 'binomial_pmf': {
          const { n, p } = distParams;
          if (x === undefined) throw new Error('x required');
          result = this.combination(n, x) * (p ** x) * ((1 - p) ** (n - x));
          break;
        }
        case 'binomial_cdf': {
          const { n, p } = distParams;
          if (x === undefined) throw new Error('x required');
          let sum = 0;
          for (let k = 0; k <= x; k++) {
            sum += this.combination(n, k) * (p ** k) * ((1 - p) ** (n - k));
          }
          result = sum;
          break;
        }
        case 'normal_pdf': {
          const { mean = 0, stddev = 1 } = distParams;
          if (x === undefined) throw new Error('x required');
          result = (1 / (stddev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / stddev) ** 2);
          break;
        }
        case 'normal_cdf': {
          const { mean = 0, stddev = 1 } = distParams;
          if (x === undefined) throw new Error('x required');
          result = this.normalCdf(x, mean, stddev);
          break;
        }
        case 'poisson_pmf': {
          const { lambda } = distParams;
          if (x === undefined) throw new Error('x required');
          result = (Math.exp(-lambda) * (lambda ** x)) / this.factorial(x);
          break;
        }
        default:
          throw new Error(`Unknown distribution: ${dist}`);
      }

      return { dist, params: distParams, x, result: Math.round(result * 1e15) / 1e15 };
    } catch (error) {
      logger.error(`Probability execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ProbabilityTool;
