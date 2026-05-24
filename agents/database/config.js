const AgentConfig = require('../base/AgentConfig');

class DatabaseAgentConfig extends AgentConfig {
  constructor() {
    super('database', 'sub');
    this.priority = 10;
    this.timeout = 25000;
    this.maxRetries = 2;
    this.metadata = {
      description: 'Specializes in complex SQL queries and data management',
      capabilities: ['query_generation', 'schema_analysis', 'data_transformation', 'transaction_management', 'data_migration'],
      tools: ['query_builder', 'schema_analyzer', 'transaction_tool', 'data_transform'],
    };
  }
}

module.exports = DatabaseAgentConfig;
