const AgentConfig = require('../base/AgentConfig');

class WebAgentConfig extends AgentConfig {
  constructor() {
    super('web', 'sub');
    this.priority = 10;
    this.timeout = 25000;
    this.maxRetries = 2;
    this.metadata = {
      description: 'Specializes in web scraping, form submission, and data extraction',
      capabilities: ['scraping', 'form_submission', 'data_extraction', 'cookie_management', 'pagination_handling'],
      tools: ['browser', 'dom_parser', 'http_client', 'cookie_manager', 'form_submission'],
    };
  }
}

module.exports = WebAgentConfig;
