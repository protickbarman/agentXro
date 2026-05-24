const Agent = require('../base/Agent');
const MainAgentConfig = require('./config');
const logger = require('../../config/logger');
const { countTokens } = require('../../utils/tokenCounter');

/**
 * Main Agent - Central Orchestrator
 * Routes queries to appropriate tools or sub-agents based on complexity
 */
class MainAgent extends Agent {
  constructor(llmManager, toolRegistry, agentRegistry) {
    super('main', 'main');
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.agentRegistry = agentRegistry;
    this.config = new MainAgentConfig();
  }

  /**
   * Initialize main agent
   * @param {object} config - Configuration
   */
  async initialize(config = {}) {
    await super.initialize(config);
    logger.info('Main Agent initialized', { capabilities: this.getCapabilities() });
  }

  /**
   * Broadcast status update via WebSocket
   */
  _broadcastStatus(conversationId, step, label, agent = null, data = {}) {
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversationId, {
        type: 'status_update',
        conversationId,
        step,
        label,
        agent,
        data,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Process user query and route to tools or sub-agents
   * @param {object} context - Execution context
   * @returns {Promise} Processing result
   */
  async execute(context) {
    const startTime = Date.now();

    try {
      const { conversationId, userId, userMessage, conversationHistory = [] } = context;

      logger.info('Main Agent processing query', {
        conversationId,
        messageLength: userMessage.length,
      });

      const analysis = await this._analyzeQuery(userMessage, conversationHistory);
      logger.info('Query analysis complete', {
        complexity: analysis.complexity,
        shouldUseDirectTools: analysis.shouldUseDirectTools,
        recommendedAgents: analysis.recommendedAgents,
      });

      let result;

      if (analysis.shouldUseDirectTools) {
        result = await this._executeWithTools(userMessage, analysis, conversationId);
      } else {
        result = await this._delegateToSubAgents(userMessage, analysis, conversationHistory, conversationId, context.serverBaseUrl);
      }

      const executionTime = Date.now() - startTime;
      const response = this.formatResponse(result, `Successfully processed with ${analysis.complexity} complexity`);

      return {
        ...response,
        complexity: analysis.complexity,
        executionTime,
        analysis,
        tokensUsed: this.llmManager.totalTokensUsed,
      };
    } catch (error) {
      logger.error('Main Agent execution failed', {
        error: error.message,
        stack: error.stack,
      });

      if (global.broadcastToConversation && context.conversationId) {
        global.broadcastToConversation(context.conversationId, {
          type: 'agent_step',
          conversationId: context.conversationId,
          step: 'error',
          message: `Error: ${error.message}`,
          timestamp: Date.now(),
        });
      }

      throw error;
    }
  }

  /**
   * Decide whether to acknowledge and what to say.
   * Returns null (no ack) for simple queries the agent can answer immediately.
   * @private
   */
  _getAcknowledgment(userMessage, analysis) {
    const lower = userMessage.trim().toLowerCase();
    const agents = analysis.recommendedAgents || [];
    const isGreeting = /^(hi|hello|hey|yo|sup|good morning|good evening|good afternoon)\b/.test(lower);
    const isShortChat = /^(yes|no|ok|okay|thanks|thank you|ty|np|sure|alright|bye|goodbye)$/i.test(lower);
    const isSimpleQ = analysis.complexity === 'simple' && !agents.length;

    // Skip ack for quick casual chat — answer directly
    if (isGreeting || isShortChat || (isSimpleQ && lower.length < 30)) {
      return null;
    }

    const topic = userMessage.replace(/^(what|who|how|tell me|show me|give me|find|search|research|about)\s*(is|are|was|were|the|a|an|about|for|me)?\s*/i, '').trim().substring(0, 60);

    if (agents.includes('search') || /\b(price|rate|cost|value|worth|market|stock|crypto|news|weather|search|find|lookup|research|information|about|current|latest|update|history|fundamental|outlook|future)\b/i.test(lower)) {
      if (topic) return `Let me look up ${topic}...`;
      return `Let me search for that information...`;
    }
    if (agents.includes('code') || /\b(code|write|function|script|program|build|create|implement)\b/i.test(lower)) {
      return `Let me write that code for you...`;
    }
    if (agents.includes('database') || /\b(database|query|sql|data|table|record)\b/i.test(lower)) {
      return `Let me query the database for you...`;
    }
    if (agents.includes('web') || /\b(scrape|website|url|fetch|download|extract|page)\b/i.test(lower)) {
      if (topic) return `Let me fetch info about ${topic}...`;
      return `Let me fetch that webpage for you...`;
    }
    if (analysis.complexity === 'complex') {
      return `Let me work through that step by step...`;
    }
    // Medium complexity or longer simple query → brief ack
    return `Let me help you with that...`;
  }

  /**
   * Analyze query complexity
   * @private
   */
  async _analyzeQuery(userMessage, conversationHistory = []) {
    try {
      // Simple heuristic-based complexity analysis
      const messageLength = userMessage.length;
      const hasMultipleSteps = /and|then|after|next|also|additionally/i.test(userMessage);
      const hasWebRequirements = /scrape|website|link|url|fetch|download|extract/i.test(userMessage);
      const hasCodeRequirements = /code|execute|run|script|function|debug/i.test(userMessage);
      const hasDatabaseRequirements = /database|query|sql|table|insert|update|delete|join/i.test(userMessage);
      const hasSearchRequirements = /search|find|lookup|research|information|news/i.test(userMessage);

      let complexity = 'simple';
      let shouldUseDirectTools = true;
      const recommendedAgents = [];
      const requiredCapabilities = [];

      // Expand: detect info/lookup needs more broadly
      const hasInfoRequirements = /price|rate|crypto|stock|market|weather|news|about|what is|who is|tell me about|current|latest|update|how (much|many)|capital|supply|volume|history|fundamental|outlook|future/i.test(userMessage);
      const hasMathRequirements = /calculate|compute|sum|total|average|count|math|equation|formula|solve|plus|minus|times|divided/i.test(userMessage);

      // Determine complexity
      if (
        hasMultipleSteps ||
        hasWebRequirements ||
        hasCodeRequirements ||
        hasDatabaseRequirements ||
        hasSearchRequirements ||
        hasInfoRequirements ||
        hasMathRequirements
      ) {
        complexity = 'complex';
        shouldUseDirectTools = false;
      } else if (messageLength > 200) {
        complexity = 'medium';
        shouldUseDirectTools = true;
      }

      // Recommend agents
      if (hasWebRequirements) {
        recommendedAgents.push('web');
        requiredCapabilities.push('web_scraping');
      }
      if (hasCodeRequirements || hasMathRequirements) {
        recommendedAgents.push('code');
        requiredCapabilities.push('code_execution');
      }
      if (hasDatabaseRequirements) {
        recommendedAgents.push('database');
        requiredCapabilities.push('database_queries');
      }
      if (hasSearchRequirements || hasInfoRequirements) {
        recommendedAgents.push('search');
        requiredCapabilities.push('information_search');
      }

      // Fallback: complex query with no specific match → use search agent
      if (recommendedAgents.length === 0 && complexity === 'complex') {
        recommendedAgents.push('search');
        requiredCapabilities.push('information_search');
      }

      return {
        complexity,
        shouldUseDirectTools,
        recommendedAgents,
        requiredCapabilities,
        metrics: {
          messageLength,
          hasMultipleSteps,
          hasWebRequirements,
          hasCodeRequirements,
          hasDatabaseRequirements,
          hasSearchRequirements,
          hasInfoRequirements,
          hasMathRequirements,
        },
      };
    } catch (error) {
      logger.error('Query analysis failed', { error: error.message });
      // Default to simple if analysis fails
      return {
        complexity: 'simple',
        shouldUseDirectTools: true,
        recommendedAgents: [],
        requiredCapabilities: [],
      };
    }
  }

  /**
   * Execute query using direct tools
   * @private
   */
  async _executeWithTools(userMessage, analysis, conversationId) {
    try {
      logger.info('Executing with direct tools');

      const response = await this.llmManager.chat(
        userMessage,
        [],
        {
          stream: true,
          maxTokens: 512,
          onChunk: (chunk) => {
            if (global.broadcastToConversation && conversationId) {
              global.broadcastToConversation(conversationId, {
                type: 'content_chunk',
                conversationId,
                content: chunk,
                timestamp: Date.now(),
              });
            }
          },
        }
      );

      return {
        type: 'direct_tools',
        response: response.content,
        tokensUsed: response.tokensUsed,
        provider: response.provider,
        model: response.model,
        id: response.id,
        object: response.object,
        created: response.created,
        choices: response.choices,
        usage: response.usage,
      };
    } catch (error) {
      logger.error('Direct tool execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Delegate to sub-agents
   * @private
   */
  async _delegateToSubAgents(userMessage, analysis, conversationHistory = [], conversationId, serverBaseUrl) {
    try {
      logger.info('Delegating to sub-agents', {
        agents: analysis.recommendedAgents,
      });

      const subAgentResults = [];

      for (const agentName of analysis.recommendedAgents) {
        try {
          if (!this.agentRegistry.has(agentName)) {
            logger.warn(`Agent ${agentName} not registered, skipping`);
            continue;
          }

          const agent = this.agentRegistry.get(agentName);
          const agentResult = await agent.execute({
            userMessage,
            conversationHistory,
            analysisContext: analysis,
            serverBaseUrl,
            conversationId,
          });

          subAgentResults.push({
            agent: agentName,
            success: true,
            result: agentResult,
          });
        } catch (error) {
          logger.error(`Sub-agent ${agentName} execution failed`, {
            error: error.message,
          });

          subAgentResults.push({
            agent: agentName,
            success: false,
            error: error.message,
          });
        }
      }

      if (subAgentResults.every(r => !r.success)) {
        const response = await this.llmManager.chat(
          userMessage,
          conversationHistory,
          { maxTokens: 1024 }
        );

        return {
          type: 'fallback',
          response: response.content,
          subAgentResults,
          tokensUsed: response.tokensUsed,
          provider: response.provider,
          ...response,
        };
      }

      const successfulResults = subAgentResults.filter(r => r.success);

      if (successfulResults.length === 1) {
        const single = successfulResults[0];
        const resultData = single.result.data || single.result;
        return {
          type: single.agent + '_agent',
          response: resultData.response || resultData.content || '',
          files: resultData.files || [],
          subAgentResults,
          tokensUsed: this.llmManager.totalTokensUsed,
        };
      }

      const aggregatedResponse = this._aggregateResults(successfulResults, userMessage);

      return {
        type: 'multi_agent',
        response: aggregatedResponse.text,
        files: aggregatedResponse.files,
        subAgentResults,
        tokensUsed: this.llmManager.totalTokensUsed,
      };
    } catch (error) {
      logger.error('Sub-agent delegation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Aggregate results from multiple sub-agents
   * @private
   */
  _aggregateResults(results, userMessage) {
    try {
      let aggregated = '';
      const allFiles = [];

      for (const { agent, result } of results) {
        const responseData = result.data || result;
        const responseText = responseData.response || responseData.content || JSON.stringify(responseData);
        aggregated += `${responseText}\n\n`;

        if (responseData.files && responseData.files.length > 0) {
          allFiles.push(...responseData.files);
        }
      }

      return { text: aggregated.trimEnd(), files: allFiles };
    } catch (error) {
      logger.error('Result aggregation failed', { error: error.message });
      return { text: 'Unable to aggregate results', files: [] };
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return {
      name: this.name,
      type: this.type,
      description: 'Central orchestrator that routes queries to appropriate tools or sub-agents',
      capabilities: [
        'query_analysis',
        'complexity_detection',
        'tool_selection',
        'agent_delegation',
        'result_aggregation',
        'fallback_handling',
      ],
      tools: this.toolRegistry?.getNames() || [],
    };
  }
}

module.exports = MainAgent;
