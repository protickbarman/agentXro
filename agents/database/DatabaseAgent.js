const Agent = require('../base/Agent');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

/**
 * Database Agent - Uses llama-3.3-70b (702ms, good at structured data)
 */
class DatabaseAgent extends Agent {
  constructor(llmManager, toolRegistry) {
    super('database', 'sub');
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.outputDir = path.join(__dirname, '../../outputs/database');
  }

  _broadcastStatus(conversationId, step, label, data = {}) {
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversationId, {
        type: 'status_update', conversationId, step, label,
        agent: 'database', data, timestamp: Date.now(),
      });
    }
  }

  async execute(context) {
    const startTime = Date.now();
    logger.info('Database Agent executing', { userMessage: context.userMessage.substring(0, 50) });

    try {
      const { userMessage, conversationHistory = [], conversationId } = context;

      const sqlPrompt = `You are a Database Agent. Convert this request into a SQL query.
Only output the SQL query, nothing else. Use standard PostgreSQL syntax.

Request: ${userMessage}

SQL:`;

      const sqlResult = await this.llmManager.chat(
        sqlPrompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 256,
          temperature: 0.1,
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

      const sqlQuery = this._extractSQL(sqlResult.content);

      let queryResult = null;
      let error = null;

      if (sqlQuery && sqlQuery.toUpperCase().startsWith('SELECT')) {
        try {
          const result = await query(sqlQuery);
          queryResult = { rows: result.rows, rowCount: result.rowCount };
        } catch (dbError) {
          error = dbError.message;
          logger.warn('Database query failed', { error: dbError.message, sql: sqlQuery });
        }
      } else {
        error = 'Only SELECT queries are allowed for safety';
      }

      const analysisPrompt = `You are a Database Agent. ${queryResult ?
        `Here are the query results:\n${JSON.stringify(queryResult.rows, null, 2)}\n\nExplain these results.` :
        `The query could not be executed: ${error}\n\nProvide guidance.`}

Original request: ${userMessage}
Generated SQL: ${sqlQuery}`;

      const analysis = await this.llmManager.chat(
        analysisPrompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 512,
          temperature: 0.5,
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

      const fileName = `query_${uuidv4().slice(0, 8)}.json`;
      const outputPath = path.join(this.outputDir, fileName);
      fs.writeFileSync(outputPath, JSON.stringify({
        request: userMessage, sql: sqlQuery, result: queryResult,
        error, analysis: analysis.content, timestamp: new Date().toISOString(),
      }, null, 2));

      const executionTime = Date.now() - startTime;

      return this.formatResponse({
        type: 'database_agent',
        response: analysis.content,
        sql: sqlQuery,
        queryResult: queryResult ? { rowCount: queryResult.rowCount, sample: queryResult.rows.slice(0, 5) } : null,
        error,
        files: [outputPath],
        tokensUsed: sqlResult.tokensUsed + analysis.tokensUsed,
        executionTime,
      });
    } catch (error) {
      logger.error('Database Agent execution failed', { error: error.message });
      throw error;
    }
  }

  _extractSQL(content) {
    const codeBlockRegex = /```(?:sql)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    if (match) return match[1].trim();
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const sqlLines = lines.filter(l => /^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|DROP)/i.test(l));
    return sqlLines.length > 0 ? sqlLines[0] : content.trim();
  }
}

module.exports = DatabaseAgent;
