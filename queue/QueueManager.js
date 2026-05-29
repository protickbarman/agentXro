const logger = require('../config/logger');
const env    = require('../config/env');

/* ─────────────────────────────────────────────────────────
   In-process queue wrapper
   • Executes jobs directly via registered processors
   • Bull/Redis queue is NOT used by the server process
   • Worker process (if running) handles its own Redis jobs
───────────────────────────────────────────────────────── */

let Bull;
try { Bull = require('bull'); } catch { Bull = null; }

const QUEUE_NAMES = [
  'saveConversation', 'saveMessage',
  'saveToolExecution', 'saveAgentExecution', 'updateSession',
];

class QueueManager {
  constructor() {
    this.queues      = {};   // Bull queues (if Redis available)
    this.processors  = {};   // registered job-handler fns
    this.redisOk     = null; // null = untested, true/false after first attempt
    this.initialized = false;
  }

  /* ── Wire up a handler fn for a queue name ── */
  process(queueName, concurrency, handler) {
    this.processors[queueName] = handler;
    if (this.queues[queueName]) {
      this.queues[queueName].process(concurrency, handler);
    }
  }

  /* ── Initialize Bull queues (best-effort) ── */
  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    if (!Bull) {
      logger.warn('Bull not available — using direct (in-process) queue fallback');
      this.redisOk = false;
      return;
    }

    const redisConfig = {
      host:                 env.REDIS.host     || 'localhost',
      port:                 env.REDIS.port     || 6379,
      password:             env.REDIS.password || undefined,
      maxRetriesPerRequest: 1,       // fail fast — don't spin 20 times
      enableReadyCheck:     false,
      connectTimeout:       3000,
      lazyConnect:          true,
    };

    for (const name of QUEUE_NAMES) {
      try {
        const q = new Bull(name, { redis: redisConfig });

        q.on('error', (err) => {
          if (this.redisOk !== false) {
            logger.warn(`Bull queue [${name}] error — switching to direct fallback`, { error: err.message });
            this.redisOk = false;
          }
        });

        q.on('ready', () => {
          if (this.redisOk !== true) {
            logger.info('Bull / Redis connection established');
            this.redisOk = true;
          }
        });

        // Re-attach any processor that was registered before initialize()
        if (this.processors[name]) {
          const concurrency = env.WORKER?.concurrency || 1;
          q.process(concurrency, this.processors[name]);
        }

        this.queues[name] = q;
      } catch (err) {
        logger.warn(`Could not create Bull queue [${name}]`, { error: err.message });
        this.redisOk = false;
      }
    }

    logger.info('QueueManager initialized', { queues: QUEUE_NAMES });
  }

  /* ── Add a job — direct in-process execution ── */
  async add(queueName, data, opts = {}) {
    if (!this.initialized) this.initialize();
    return this._runDirect(queueName, data);
  }

  async _runDirect(queueName, data) {
    const handler = this.processors[queueName];
    if (!handler) {
      logger.debug(`No processor registered for [${queueName}] — job dropped silently`);
      return null;
    }
    try {
      const result = await handler({ data });
      logger.debug(`Direct job [${queueName}] succeeded`);
      return result;
    } catch (err) {
      logger.error(`Direct job [${queueName}] failed`, { error: err.message });
      return null;   // never throw — caller shouldn't crash over a save failure
    }
  }

  async close() {
    for (const [name, queue] of Object.entries(this.queues)) {
      try { await queue.close(); logger.debug(`Queue closed: ${name}`); }
      catch (err) { logger.warn(`Error closing queue ${name}`, { error: err.message }); }
    }
    this.queues      = {};
    this.initialized = false;
    logger.info('QueueManager closed');
  }
}

module.exports = new QueueManager();
