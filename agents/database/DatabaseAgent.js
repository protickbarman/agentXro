const Agent = require('../base/Agent');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { mongoose } = require('../../config/mongodb');

const mongoQuerySchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  collection: { type: String, required: true },
  operation: { type: String, required: true },
  filter: { type: mongoose.Schema.Types.Mixed, default: {} },
  update: { type: mongoose.Schema.Types.Mixed, default: {} },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const MongoQuery = mongoose.models.MongoQuery
  || mongoose.model('MongoQuery', mongoQuerySchema, 'mongo_queries');

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

      const mongoPrompt = `You are a Database Agent. Convert this request into a MongoDB query.
Only output valid JSON - a MongoDB query object with collection, operation, filter, and optional update fields.
Supported operations: find, findOne, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate.

Request: ${userMessage}

MongoDB Query:`;

      const mongoResult = await this.llmManager.chat(
        mongoPrompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 512,
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

      let queryResult = null;
      let error = null;

      try {
        const queryObj = this._extractMongoQuery(mongoResult.content);
        queryResult = await this._executeMongoQuery(queryObj);
      } catch (dbError) {
        error = dbError.message;
        logger.warn('Database query failed', { error: dbError.message });
      }

      const analysisPrompt = `You are a Database Agent. ${queryResult ?
        `Here are the query results:\n${JSON.stringify(queryResult.result, null, 2)}\n\nExplain these results.` :
        `The query could not be executed: ${error}\n\nProvide guidance.`}

Original request: ${userMessage}
Generated MongoDB Query: ${JSON.stringify(queryObj || {})}`;

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
        request: userMessage,
        mongoQuery: queryObj || mongoResult.content,
        result: queryResult,
        error,
        analysis: analysis.content,
        timestamp: new Date().toISOString(),
      }, null, 2));

      const executionTime = Date.now() - startTime;

      return this.formatResponse({
        type: 'database_agent',
        response: analysis.content,
        mongoQuery: queryObj,
        queryResult: queryResult ? { result: queryResult.result } : null,
        error,
        files: [outputPath],
        tokensUsed: mongoResult.tokensUsed + analysis.tokensUsed,
        executionTime,
      });
    } catch (error) {
      logger.error('Database Agent execution failed', { error: error.message });
      throw error;
    }
  }

  _extractMongoQuery(content) {
    const codeBlockRegex = /```(?:json)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    const jsonStr = match ? match[1].trim() : content.trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          return JSON.parse(objMatch[0]);
        } catch {}
      }
      throw new Error('Could not parse MongoDB query JSON');
    }
  }

  async _executeMongoQuery(queryObj) {
    const { collection, operation, filter, update, pipeline } = queryObj;

    if (!collection) throw new Error('Collection name required');
    if (!operation) throw new Error('Operation required');

    let result;
    const db = mongoose.connection.db;
    const col = db.collection(collection);

    switch (operation.toLowerCase()) {
      case 'find':
        result = await col.find(filter || {}).limit(100).toArray();
        break;
      case 'findone':
      case 'findOne':
        result = await col.findOne(filter || {});
        break;
      case 'insertone':
      case 'insertOne':
        result = await col.insertOne(update || filter);
        break;
      case 'insertmany':
      case 'insertMany':
        result = await col.insertMany(Array.isArray(update || filter) ? update || filter : [update || filter]);
        break;
      case 'updateone':
      case 'updateOne':
        result = await col.updateOne(filter, { $set: update });
        break;
      case 'updatemany':
      case 'updateMany':
        result = await col.updateMany(filter, { $set: update });
        break;
      case 'deleteone':
      case 'deleteOne':
        result = await col.deleteOne(filter);
        break;
      case 'deletemany':
      case 'deleteMany':
        result = await col.deleteMany(filter);
        break;
      case 'aggregate':
        result = await col.aggregate(pipeline || []).toArray();
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    await MongoQuery.create({
      collection,
      operation,
      filter,
      update,
      result,
    });

    return { operation, collection, result };
  }
}

module.exports = DatabaseAgent;