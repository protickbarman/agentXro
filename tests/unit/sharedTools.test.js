const assert = require('assert');
const CalculatorTool = require('../../tools/shared/CalculatorTool');
const JSONParserTool = require('../../tools/shared/JSONParserTool');
const TimerTool = require('../../tools/shared/TimerTool');

describe('Shared Tools', () => {
  describe('Calculator Tool', () => {
    let calculator;

    beforeEach(() => {
      calculator = new CalculatorTool();
    });

    it('should perform basic arithmetic', async () => {
      const result = await calculator.execute({ expression: '2+2' });
      assert.strictEqual(result.result, 4);
    });

    it('should handle multiplication', async () => {
      const result = await calculator.execute({ expression: '5*3' });
      assert.strictEqual(result.result, 15);
    });

    it('should throw error for invalid expression', async () => {
      assert.rejects(async () => {
        await calculator.execute({ expression: 'invalid' });
      });
    });

    it('should validate expression is required', async () => {
      assert.rejects(async () => {
        await calculator.execute({ expression: '' });
      });
    });
  });

  describe('JSON Parser Tool', () => {
    let parser;

    beforeEach(() => {
      parser = new JSONParserTool();
    });

    it('should parse valid JSON', async () => {
      const result = await parser.execute({ json: '{"key":"value"}' });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.parsed.key, 'value');
    });

    it('should return error for invalid JSON', async () => {
      const result = await parser.execute({ json: '{invalid}' });
      assert.strictEqual(result.valid, false);
      assert(result.error);
    });

    it('should format JSON when requested', async () => {
      const result = await parser.execute({
        json: '{"a":1,"b":2}',
        format: true,
      });
      assert.strictEqual(result.valid, true);
      assert(result.formatted);
    });

    it('should validate json is required', async () => {
      assert.rejects(async () => {
        await parser.execute({ json: '' });
      });
    });
  });

  describe('Timer Tool', () => {
    let timer;

    beforeEach(() => {
      timer = new TimerTool();
    });

    it('should start a timer', async () => {
      const result = await timer.execute({ operation: 'start', timerId: 'test' });
      assert.strictEqual(result.operation, 'started');
      assert.strictEqual(result.timerId, 'test');
    });

    it('should measure elapsed time', async () => {
      await timer.execute({ operation: 'start', timerId: 'test' });
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await timer.execute({ operation: 'end', timerId: 'test' });
      assert.strictEqual(result.operation, 'ended');
      assert(result.elapsedMs >= 100);
    });

    it('should throw error for unknown timer on end', async () => {
      assert.rejects(async () => {
        await timer.execute({ operation: 'end', timerId: 'unknown' });
      });
    });
  });
});
