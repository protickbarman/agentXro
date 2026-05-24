const AgentConfig = require('../base/AgentConfig');

class SearchAgentConfig extends AgentConfig {
  constructor() {
    super('search', 'sub');
    this.priority = 10;
    this.timeout = 25000;
    this.maxRetries = 2;
    this.metadata = {
      description: 'Specializes in advanced search and information synthesis',
      capabilities: ['multi_source_search', 'information_synthesis', 'source_tracking', 'data_extraction', 'relevance_ranking'],
      tools: ['multi_source_search', 'info_synthesis', 'source_tracker', 'data_extractor'],
    };
  }
}

module.exports = SearchAgentConfig;
