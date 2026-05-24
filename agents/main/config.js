const AgentConfig = require('../base/AgentConfig');

class MainAgentConfig extends AgentConfig {
  constructor() {
    super('main', 'main');
    this.priority = 100;
    this.timeout = 30000;
    this.maxRetries = 3;
    this.metadata = {
      description: 'Central orchestrator for multi-agent system',
      capabilities: ['query_analysis', 'tool_selection', 'agent_coordination', 'result_aggregation'],
    };
  }
}

module.exports = MainAgentConfig;
