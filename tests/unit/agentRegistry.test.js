const assert = require('assert');
const agentRegistry = require('../../agents/AgentRegistry');

describe('Agent Registry', () => {
  beforeEach(() => {
    agentRegistry.clear();
  });

  it('should register an agent', async () => {
    const mockAgent = {
      name: 'test-agent',
      type: 'test',
      initialize: async () => {},
      execute: async () => ({}),
      getCapabilities: () => ({ name: 'test-agent' }),
    };

    await agentRegistry.register('test-agent', mockAgent);
    assert(agentRegistry.has('test-agent'));
  });

  it('should retrieve a registered agent', async () => {
    const mockAgent = {
      name: 'test-agent',
      type: 'test',
      initialize: async () => {},
      execute: async () => ({}),
      getCapabilities: () => ({ name: 'test-agent' }),
    };

    await agentRegistry.register('test-agent', mockAgent);
    const agent = agentRegistry.get('test-agent');
    assert.strictEqual(agent.name, 'test-agent');
  });

  it('should throw error when getting non-existent agent', () => {
    assert.throws(() => {
      agentRegistry.get('non-existent');
    }, /Agent 'non-existent' not found/);
  });

  it('should return all agent names', async () => {
    const mockAgent1 = {
      name: 'agent1',
      initialize: async () => {},
      getCapabilities: () => ({}),
    };
    const mockAgent2 = {
      name: 'agent2',
      initialize: async () => {},
      getCapabilities: () => ({}),
    };

    await agentRegistry.register('agent1', mockAgent1);
    await agentRegistry.register('agent2', mockAgent2);

    const names = agentRegistry.getNames();
    assert(names.includes('agent1'));
    assert(names.includes('agent2'));
    assert.strictEqual(names.length, 2);
  });

  it('should clear all agents', async () => {
    const mockAgent = {
      name: 'test',
      initialize: async () => {},
      getCapabilities: () => ({}),
    };

    await agentRegistry.register('test', mockAgent);
    agentRegistry.clear();

    assert(!agentRegistry.has('test'));
  });
});
