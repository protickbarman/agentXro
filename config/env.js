const path = require('path');
const fs = require('fs');

// Load config.json
const configPath = path.join(__dirname, '..', 'config.json');
let cfg = {};
if (fs.existsSync(configPath)) {
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse config.json, using defaults', e.message);
  }
} else {
  console.warn('config.json not found, using defaults');
}

// Helper: read from config.json, fallback to process.env (for backwards compat)
const get = (key, def) => cfg[key] !== undefined ? cfg[key] : (process.env[key] !== undefined ? process.env[key] : def);
const getInt = (key, def) => { const v = get(key); return v !== undefined ? parseInt(v, 10) : def; };
const getBool = (key, def) => { const v = get(key); return v !== undefined ? (v === true || v === 'true') : def; };

module.exports = {
  NODE_ENV: get('NODE_ENV', 'development'),
  PORT: getInt('PORT', 3000),
  LOG_LEVEL: get('LOG_LEVEL', 'info'),

  DB: {
    host: get('DB_HOST'),
    port: getInt('DB_PORT'),
    database: get('DB_NAME'),
    user: get('DB_USER'),
    password: get('DB_PASSWORD'),
    ssl: getBool('DB_SSL', false),
    poolMin: getInt('DB_POOL_MIN', 2),
    poolMax: getInt('DB_POOL_MAX', 10),
  },

  REDIS: (() => {
    const url = get('REDIS_URL');
    if (url) {
      try {
        const parsed = new URL(url);
        return { url, host: parsed.hostname, port: parseInt(parsed.port, 10) || 6379, password: parsed.password || undefined, db: parseInt(parsed.pathname.slice(1), 10) || 0 };
      } catch {}
    }
    return { url: undefined, host: 'localhost', port: 6379, password: undefined, db: 0 };
  })(),

  JWT: {
    secret: get('JWT_SECRET'),
    refreshSecret: get('JWT_REFRESH_SECRET'),
    expiresIn: get('JWT_EXPIRY', '15m'),
    refreshExpiresIn: get('JWT_REFRESH_EXPIRY', '7d'),
  },

  NIM: {
    apiKey: get('NIM_API_KEY'),
    baseUrl: get('NIM_BASE_URL'),
    model: get('NIM_MODEL'),
  },

  FALLBACK_LLM: {
    provider: get('FALLBACK_LLM_PROVIDER'),
    apiKey: get('FALLBACK_LLM_KEY'),
    model: get('FALLBACK_LLM_MODEL'),
  },

  WORKER: {
    concurrency: getInt('WORKER_CONCURRENCY', 1),
    processInterval: getInt('WORKER_PROCESS_INTERVAL', 5000),
    maxRetries: getInt('MAX_RETRIES_ON_FAILURE', 3),
    backoffMultiplier: getInt('RETRY_BACKOFF_MULTIPLIER', 2),
  },

  AGENT: {
    mainTimeout: getInt('MAIN_AGENT_TIMEOUT', 30000),
    subTimeout: getInt('SUB_AGENT_TIMEOUT', 25000),
    complexityMedium: getInt('COMPLEXITY_THRESHOLD_MEDIUM', 5),
    complexityHigh: getInt('COMPLEXITY_THRESHOLD_HIGH', 8),
  },

  WEBSOCKET: {
    enabled: getBool('ENABLE_WEBSOCKET', true),
    pingInterval: getInt('WEBSOCKET_PING_INTERVAL', 30000),
  },

  TOOLS: {
    codeExecutorTimeout: getInt('TOOL_CODE_EXECUTOR_TIMEOUT', 5000),
    webSearchTimeout: getInt('TOOL_WEB_SEARCH_TIMEOUT', 10000),
    puppeteerHeadless: getBool('PUPPETEER_HEADLESS', true),
    puppeteerTimeout: getInt('PUPPETEER_TIMEOUT', 15000),
  },

  RATE_LIMIT: {
    window: get('RATE_LIMIT_WINDOW', '15m'),
    maxRequests: getInt('RATE_LIMIT_MAX_REQUESTS', 100),
    perTool: getInt('RATE_LIMIT_PER_TOOL', 50),
  },

  SECURITY: {
    bcryptRounds: getInt('BCRYPT_ROUNDS', 10),
    sessionTimeout: getInt('SESSION_TIMEOUT_MS', 86400000),
  },

  LOGGING: {
    dir: get('LOG_DIR', './logs'),
    maxSize: get('LOG_MAX_SIZE', '10m'),
    maxFiles: getInt('LOG_MAX_FILES', 14),
  },

  FEATURES: {
    debugEndpoints: getBool('ENABLE_DEBUG_ENDPOINTS', false),
  },
};
