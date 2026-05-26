const Tool = require('../base/Tool');
const logger = require('../../config/logger');

class EmailSendTool extends Tool {
  constructor() {
    super('email_send', {
      description: 'Send an email via SMTP or return configuration info',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body (plain text or HTML)' },
          from: { type: 'string', description: 'Sender email address' },
        },
        required: ['to', 'subject', 'body'],
      },
    });
  }

  validate(p) {
    if (!p.to || typeof p.to !== 'string') throw new Error('to is required');
    if (!p.subject || typeof p.subject !== 'string') throw new Error('subject is required');
    if (!p.body || typeof p.body !== 'string') throw new Error('body is required');
    return true;
  }

  async execute(p) {
    try {
      this.validate(p);
      if (process.env.SMTP_HOST) {
        return this.formatResult({
          note: 'SMTP is configured. Would send email via nodemailer-like transport.',
          to: p.to,
          subject: p.subject,
          from: p.from || process.env.SMTP_FROM || 'noreply@example.com',
          configured: true,
        });
      }
      return this.formatResult({
        note: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars to enable email sending.',
        to: p.to,
        subject: p.subject,
        from: p.from || 'noreply@example.com',
        configured: false,
      });
    } catch (e) {
      logger.error(`EmailSendTool failed: ${e.message}`);
      return this.formatError(e);
    }
  }
}

module.exports = EmailSendTool;
