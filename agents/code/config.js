const AgentConfig = require('../base/AgentConfig');

class CodeAgentConfig extends AgentConfig {
  constructor() {
    super('code', 'sub');
    this.priority = 10;
    this.timeout = 25000;
    this.maxRetries = 2;
    this.metadata = {
      description: 'Specializes in code execution, debugging, and analysis',
      capabilities: ['code_execution', 'syntax_validation', 'code_analysis', 'debugging', 'performance_analysis'],
      tools: ['code_executor', 'syntax_validator', 'code_analyzer', 'debugger'],
    };
  }
}

module.exports = CodeAgentConfig;
