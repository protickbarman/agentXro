const Agent = require('../base/Agent');
const logger = require('../../config/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class CodeAgent extends Agent {
  constructor(llmManager, toolRegistry) {
    super('code', 'sub');
    this.llmManager = llmManager;
    this.toolRegistry = toolRegistry;
    this.outputDir = path.join(__dirname, '../../outputs/code');
  }

  _wantsCodeDirect(userMessage) {
    const lower = userMessage.toLowerCase().trim();
    const codeDirectPattern = /^(give|show|display|print|output|let me see|what('s|\sis))/i;
    const hasCodeKeyword = /\bcode\b/i.test(lower);
    return codeDirectPattern.test(lower) && hasCodeKeyword;
  }

  _broadcastStatus(conversationId, step, label, data = {}) {
    if (global.broadcastToConversation) {
      global.broadcastToConversation(conversationId, {
        type: 'status_update', conversationId, step, label,
        agent: 'code', data, timestamp: Date.now(),
      });
    }
  }

  async execute(context) {
    const startTime = Date.now();
    logger.info('Code Agent executing', { userMessage: context.userMessage.substring(0, 50) });

    try {
      const { userMessage, conversationHistory = [], serverBaseUrl = '', conversationId } = context;
      const wantsCodeDirect = this._wantsCodeDirect(userMessage);

      const prompt = wantsCodeDirect
        ? `You are a Code Agent. The user wants to see the code directly (not saved to a file). Provide:
1. The complete code
2. Brief explanation

Request: ${userMessage}

Respond with: language, code, explanation.`
        : `You are a Code Agent. The user wants code written to a file. Provide:
1. What code needs to be written
2. The language/framework
3. Any potential issues

Request: ${userMessage}

Respond with: language, code, explanation.`;

      const analysis = await this.llmManager.chat(
        prompt,
        conversationHistory,
        {
          stream: true,
          maxTokens: 1024,
          temperature: 0.3,
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

      const codeBlock = this._extractCode(analysis.content);
      const language = this._detectLanguage(analysis.content);

      let files = [];
      let downloadUrls = [];
      let responseText;

      if (wantsCodeDirect) {
        responseText = analysis.content;
      } else {
        const fileName = `code_${uuidv4().slice(0, 8)}.${this._getExtension(language)}`;
        const outputPath = path.join(this.outputDir, fileName);
        fs.writeFileSync(outputPath, codeBlock || analysis.content);

        const fileUrl = serverBaseUrl
          ? `${serverBaseUrl.replace(/\/$/, '')}/outputs/code/${fileName}`
          : `/outputs/code/${fileName}`;

        files = [{ fileName, path: outputPath, url: fileUrl, language }];
        downloadUrls = [fileUrl];
        responseText = `Code written to \`${fileName}\` (${language}).\n\nDownload: ${fileUrl}`;
      }

      const executionTime = Date.now() - startTime;

      return this.formatResponse({
        type: 'code_agent',
        mode: wantsCodeDirect ? 'code' : 'file',
        response: responseText,
        language,
        code: codeBlock || 'No code block found',
        files,
        downloadUrls,
        tokensUsed: analysis.tokensUsed,
        executionTime,
      });
    } catch (error) {
      logger.error('Code Agent execution failed', { error: error.message });
      throw error;
    }
  }

  _extractCode(content) {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    return match ? match[1].trim() : null;
  }

  _detectLanguage(content) {
    const langMatch = content.match(/```(\w+)/);
    if (langMatch) return langMatch[1];
    if (/function|const|let|var|=>/.test(content)) return 'javascript';
    if (/def |import |class /.test(content)) return 'python';
    return 'unknown';
  }

  _getExtension(language) {
    const extMap = {
      javascript: 'js', python: 'py', java: 'java', typescript: 'ts',
      html: 'html', css: 'css', sql: 'sql', bash: 'sh',
    };
    return extMap[language.toLowerCase()] || 'txt';
  }
}

module.exports = CodeAgent;
