const assert = require('assert');
const toolRegistry = require('../../tools/ToolRegistry');

describe('Tool Registry', () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  it('should register a tool', () => {
    const mockTool = {
      name: 'test-tool',
      description: 'A test tool',
      parameters: {},
    };

    toolRegistry.register('test-tool', mockTool);
    assert(toolRegistry.has('test-tool'));
  });

  it('should retrieve a registered tool', () => {
    const mockTool = {
      name: 'test-tool',
      description: 'A test tool',
      parameters: {},
    };

    toolRegistry.register('test-tool', mockTool);
    const tool = toolRegistry.get('test-tool');
    assert.strictEqual(tool.name, 'test-tool');
  });

  it('should throw error when getting non-existent tool', () => {
    assert.throws(() => {
      toolRegistry.get('non-existent');
    }, /Tool 'non-existent' not found/);
  });

  it('should return all tool schemas', () => {
    const mockTool1 = {
      name: 'tool1',
      description: 'Tool 1',
      parameters: { type: 'object' },
    };
    const mockTool2 = {
      name: 'tool2',
      description: 'Tool 2',
      parameters: { type: 'object' },
    };

    toolRegistry.register('tool1', mockTool1);
    toolRegistry.register('tool2', mockTool2);

    const schemas = toolRegistry.getSchemas();
    assert.strictEqual(schemas.length, 2);
    assert.strictEqual(schemas[0].name, 'tool1');
    assert.strictEqual(schemas[1].name, 'tool2');
  });

  it('should get individual tool schema', () => {
    const mockTool = {
      name: 'test-tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' },
        },
      },
    };

    toolRegistry.register('test-tool', mockTool);
    const schema = toolRegistry.getSchema('test-tool');

    assert.strictEqual(schema.name, 'test-tool');
    assert.strictEqual(schema.description, 'A test tool');
    assert(schema.parameters);
  });

  it('should return all tool names', () => {
    const mockTool1 = { name: 'tool1' };
    const mockTool2 = { name: 'tool2' };

    toolRegistry.register('tool1', mockTool1);
    toolRegistry.register('tool2', mockTool2);

    const names = toolRegistry.getNames();
    assert(names.includes('tool1'));
    assert(names.includes('tool2'));
  });

  it('should clear all tools', () => {
    const mockTool = { name: 'test' };
    toolRegistry.register('test', mockTool);
    toolRegistry.clear();

    assert(!toolRegistry.has('test'));
  });
});
