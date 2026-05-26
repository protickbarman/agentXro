const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class NumberTheoryTool extends Tool {
  constructor() {
    super('number_theory', {
      description: 'Number theory operations: gcd, lcm, is_prime, prime_factors, is_even, is_odd',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number (for gcd/lcm)' },
          op: { type: 'string', enum: ['gcd', 'lcm', 'is_prime', 'prime_factors', 'is_even', 'is_odd'], description: 'Operation' },
        },
        required: ['a', 'op'],
      },
    });
    this.timeout = 5000;
  }

  validate(params) {
    if (typeof params.a !== 'number' || !Number.isInteger(params.a)) {
      throw new Error('a must be an integer');
    }
    if (!['gcd', 'lcm', 'is_prime', 'prime_factors', 'is_even', 'is_odd'].includes(params.op)) {
      throw new Error('Invalid operation');
    }
    return true;
  }

  gcd(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) { const t = y; y = x % y; x = t; }
    return x;
  }

  isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  primeFactors(n) {
    const factors = [];
    let num = Math.abs(n);
    for (let i = 2; i * i <= num; i++) {
      while (num % i === 0) {
        factors.push(i);
        num /= i;
      }
    }
    if (num > 1) factors.push(num);
    return factors;
  }

  async execute(params) {
    try {
      this.validate(params);
      const { a, b, op } = params;

      switch (op) {
        case 'gcd':
          return { op, a, b, result: this.gcd(a, b) };
        case 'lcm':
          if (b === undefined || !Number.isInteger(b)) throw new Error('b must be an integer');
          return { op, a, b, result: Math.abs(a * b) / this.gcd(a, b) };
        case 'is_prime':
          return { op, a, result: this.isPrime(a) };
        case 'prime_factors':
          return { op, a, result: this.primeFactors(a) };
        case 'is_even':
          return { op, a, result: a % 2 === 0 };
        case 'is_odd':
          return { op, a, result: a % 2 !== 0 };
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
    } catch (error) {
      logger.error(`NumberTheory execution failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NumberTheoryTool;
