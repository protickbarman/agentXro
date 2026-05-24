const logger = require('../config/logger');
const Message = require('../models/Message');
const ToolExecution = require('../models/ToolExecution');
const AgentExecution = require('../models/AgentExecution');
const Session = require('../models/Session');

/**
 * Job Processor
 * Handles processing of all job types in the worker
 */
class JobProcessor {
  /**
   * Process SaveMessage job
   * @param {object} job - Bull job
   */
  static async processSaveMessage(job) {
    try {
      const { conversationId, userId, role, content, metadata } = job.data;

      logger.debug('Processing SaveMessage job', {
        jobId: job.id,
        conversationId,
        userId,
      });

      // Save message to database
      const message = new Message({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        metadata,
      });

      await message.save();

      logger.info('Message saved successfully', {
        jobId: job.id,
        messageId: message.id,
      });

      return { messageId: message.id };
    } catch (error) {
      logger.error('Failed to save message', {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process SaveToolExecution job
   * @param {object} job - Bull job
   */
  static async processSaveToolExecution(job) {
    try {
      const {
        agentExecutionId,
        toolName,
        toolInput,
        toolOutput,
        status,
        error,
        executionTime,
      } = job.data;

      logger.debug('Processing SaveToolExecution job', {
        jobId: job.id,
        toolName,
        agentExecutionId,
      });

      // Save tool execution to database
      const toolExecution = new ToolExecution({
        agent_execution_id: agentExecutionId,
        tool_name: toolName,
        tool_input: toolInput,
        tool_output: toolOutput,
        status,
        error,
        execution_time: executionTime,
      });

      await toolExecution.save();

      logger.info('Tool execution saved successfully', {
        jobId: job.id,
        toolExecutionId: toolExecution.id,
      });

      return { toolExecutionId: toolExecution.id };
    } catch (error) {
      logger.error('Failed to save tool execution', {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process SaveAgentExecution job
   * @param {object} job - Bull job
   */
  static async processSaveAgentExecution(job) {
    try {
      const {
        conversationId,
        agentName,
        userMessage,
        agentResponse,
        status,
        tokensUsed,
        executionTime,
        metadata,
      } = job.data;

      logger.debug('Processing SaveAgentExecution job', {
        jobId: job.id,
        agentName,
        conversationId,
      });

      // Save agent execution to database
      const agentExecution = new AgentExecution({
        conversation_id: conversationId,
        agent_name: agentName,
        user_message: userMessage,
        agent_response: agentResponse,
        status,
        tokens_used: tokensUsed,
        execution_time: executionTime,
        metadata,
      });

      await agentExecution.save();

      logger.info('Agent execution saved successfully', {
        jobId: job.id,
        agentExecutionId: agentExecution.id,
      });

      return { agentExecutionId: agentExecution.id };
    } catch (error) {
      logger.error('Failed to save agent execution', {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process UpdateSession job
   * @param {object} job - Bull job
   */
  static async processUpdateSession(job) {
    try {
      const {
        sessionId,
        lastActivity,
        metadata,
        status,
      } = job.data;

      logger.debug('Processing UpdateSession job', {
        jobId: job.id,
        sessionId,
      });

      // Update session in database
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      session.last_activity = lastActivity || new Date();
      if (metadata) {
        session.metadata = { ...session.metadata, ...metadata };
      }
      if (status) {
        session.status = status;
      }

      await session.save();

      logger.info('Session updated successfully', {
        jobId: job.id,
        sessionId: session.id,
      });

      return { sessionId: session.id };
    } catch (error) {
      logger.error('Failed to update session', {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = JobProcessor;
