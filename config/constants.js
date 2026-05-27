// Agent and assistant types
const AGENT_TYPES = {
  AGENT: 'agent',
  WEB: 'web',
  CODE: 'code',
  DATABASE: 'database',
  SEARCH: 'search',
};

// Complexity levels
const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MEDIUM: 'medium',
  COMPLEX: 'complex',
};

// Agent status
const AGENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Tool status
const TOOL_STATUS = {
  PENDING: 'pending',
  EXECUTING: 'executing',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRY: 'retry',
};

// Tool types
const TOOL_TYPES = {
  // Shared
  CALCULATOR: 'calculator',
  WEB_SEARCH: 'web_search',
  JSON_PARSER: 'json_parser',
  TIMER: 'timer',

  // Web Assistant
  BROWSER: 'browser',
  DOM_PARSER: 'dom_parser',
  HTTP_CLIENT: 'http_client',
  COOKIE_MANAGER: 'cookie_manager',
  FORM_SUBMISSION: 'form_submission',

  // Code Assistant
  CODE_EXECUTOR: 'code_executor',
  SYNTAX_VALIDATOR: 'syntax_validator',
  CODE_ANALYZER: 'code_analyzer',
  DEBUGGER: 'debugger',

  // Database Assistant
  QUERY_BUILDER: 'query_builder',
  SCHEMA_ANALYZER: 'schema_analyzer',
  TRANSACTION: 'transaction',
  DATA_TRANSFORM: 'data_transform',

  // Search Assistant
  MULTI_SOURCE_SEARCH: 'multi_source_search',
  INFO_SYNTHESIS: 'info_synthesis',
  SOURCE_TRACKER: 'source_tracker',
  DATA_EXTRACTOR: 'data_extractor',
};

// Message roles
const MESSAGE_ROLES = {
  USER: 'user',
  AGENT: 'agent',
  SYSTEM: 'system',
};

// LLM providers
const LLM_PROVIDERS = {
  NIM: 'nim',
  CLOUDFLARE: 'cloudflare',
  FALLBACK: 'fallback',
};

// Job types
const JOB_TYPES = {
  SAVE_MESSAGE: 'save_message',
  SAVE_TOOL_EXECUTION: 'save_tool_execution',
  SAVE_AGENT_EXECUTION: 'save_agent_execution',
  UPDATE_SESSION: 'update_session',
  CLEANUP: 'cleanup',
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  AGENT_TYPES,
  COMPLEXITY_LEVELS,
  AGENT_STATUS,
  TOOL_STATUS,
  TOOL_TYPES,
  MESSAGE_ROLES,
  LLM_PROVIDERS,
  JOB_TYPES,
  HTTP_STATUS,
};
