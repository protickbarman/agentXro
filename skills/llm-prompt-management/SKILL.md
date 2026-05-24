---
name: llm-prompt-management
description: LLM provider management, prompt versioning, template management, token optimization, and model configuration. Use when managing prompts, configuring LLM providers, optimizing tokens, or creating reusable prompt templates.
compatibility:
  requires:
    - LLMManager (llm/providers/LLMManager.js)
    - LLM providers (llm/providers/)
    - Token counter (utils/tokenCounter.js)
  dependencies:
    - Agent Creation skill (for agent-provider binding)
---

# LLM & Prompt Management Skill

This skill provides a complete system for managing LLM providers, versioning prompts, creating reusable templates, optimizing token usage, and tracking costs.

## Architecture Overview

```
LLM & Prompt Management
├── LLMManager              → Existing LLM provider orchestration
├── PromptRegistry          → Prompt template registry (NEW)
├── PromptVersionManager    → Version control for prompts (NEW)
├── TokenOptimizer          → Token usage analysis (NEW)
├── CostTracker             → Per-provider cost tracking (NEW)
└── PromptDashboardAPI      → REST + WebSocket endpoints (NEW)
```

## Prompt Template System

### Template Schema
```javascript
{
  id: string,
  name: string,                    // Unique template name
  version: string,                 // Semantic version
  description: string,             // What this prompt does
  systemPrompt: string,            // System-level instructions
  userTemplate: string,            // User message template with {placeholders}
  variables: [                     // Expected variables
    { name: string, type: string, required: boolean, description: string }
  ],
  provider: string,                // Target LLM provider
  model: string,                   // Target model
  config: {
    temperature: number,
    maxTokens: number,
    topP: number,
    frequencyPenalty: number,
    presencePenalty: number,
    stop: string[],
  },
  outputFormat: string,            // json | text | markdown
  metadata: {
    author: string,
    tags: string[],
    category: string,
    useSoulAlignment: boolean,     // Should use soul.md behavior
  }
}
```

## Prompt Versioning

Every prompt template is versioned. Changes create new versions.

```
prompt-name:v1 → prompt-name:v2 → prompt-name:v3
```

### Version Operations
```javascript
// Create new version
await PromptRegistry.createVersion('agent-analysis', {
  version: '2.0.0',
  systemPrompt: '...',
  userTemplate: '...',
  changelog: 'Added support for multi-step reasoning',
});

// Get specific version
const prompt = await PromptRegistry.getVersion('agent-analysis', '1.5.0');

// List all versions
const versions = await PromptRegistry.listVersions('agent-analysis');

// Rollback to previous version
await PromptRegistry.rollback('agent-analysis', '1.0.0');

// Compare versions
const diff = await PromptRegistry.diff('agent-analysis', '1.0.0', '2.0.0');
```

## Provider Management

### Provider Configuration
```javascript
const providerConfig = {
  name: 'nim',
  type: 'nvidia',
  apiKey: process.env.NIM_API_KEY,
  baseUrl: process.env.NIM_BASE_URL,
  models: [
    {
      name: 'nvidia/nemotron-3-super-120b-a12b',
      capabilities: ['text-generation', 'reasoning'],
      costPerToken: 0.00001,
      contextWindow: 131072,
    },
    {
      name: 'deepseek-ai/deepseek-v4-flash',
      capabilities: ['code-generation', 'analysis'],
      costPerToken: 0.000005,
      contextWindow: 65536,
    },
  ],
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
};
```

### Provider Operations
```javascript
// Register new provider
await LLMManager.registerProvider('nim', nimProvider);

// Get provider status
const status = await LLMManager.getProviderStatus('nim');
// { healthy: true, latency: 245ms, lastError: null }

// Switch model for a provider
await LLMManager.setModel('nim', 'deepseek-ai/deepseek-v4-flash');

// Fallback configuration
await LLMManager.setFallback('nim', 'huggingface');
```

## Token Optimization

### Token Counting & Analysis
```javascript
const TokenCounter = require('./utils/tokenCounter');

// Count tokens in a prompt
const tokenCount = await TokenCounter.count(promptText, 'claude');

// Optimize prompt for token usage
const optimized = await TokenOptimizer.optimize(promptText, {
  maxTokens: 4000,
  preserveVariables: true,
  minCompression: 0.7, // Target 70% of original
});

// Get token usage report
const report = await TokenOptimizer.getUsageReport({
  timeRange: '24h',
  provider: 'nim',
});
// { totalTokens: 150000, cost: $1.50, averagePerRequest: 2500 }
```

### Cost Tracking
```javascript
await CostTracker.recordUsage({
  provider: 'nim',
  model: 'nvidia/nemotron-3-super-120b-a12b',
  promptTokens: 500,
  completionTokens: 1200,
  totalCost: 0.017,
  userId: 'user-id',
  agentName: 'research-agent',
  timestamp: new Date(),
});

// Get cost report
const costReport = await CostTracker.getReport({
  groupBy: 'agent',
  period: 'monthly',
});
```

## Prompt Categories

| Category | Description | Template Pattern |
|----------|-------------|-----------------|
| **agent-query** | Main agent query analysis | `{query} → Analyze: complexity, capabilities, agents` |
| **agent-coordination** | Multi-agent task decomposition | `{task} → Decompose into steps, assign agents` |
| **code-execution** | Code execution instructions | `{code, input} → Execute, return output, errors` |
| **web-scraping** | Web data extraction | `{url, target} → Scrape strategy, extract data` |
| **data-analysis** | Database query generation | `{schema, request} → Generate SQL, optimize` |
| **search-synthesis** | Multi-source information synthesis | `{query, results} → Synthesize, cite sources` |
| **memory-retrieval** | Agent memory retrieval | `{context} → Find relevant memories` |
| **integration** | External service calls | `{service, action, params} → Execute integration` |

## Database Schema

```sql
-- Prompt templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  current_version VARCHAR(50) DEFAULT '1.0.0',
  description TEXT,
  category VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  provider_config JSONB DEFAULT '{}',
  output_format VARCHAR(50),
  changelog TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, version)
);

-- Token usage analytics
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(255) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost NUMERIC(10,6) DEFAULT 0,
  user_id UUID REFERENCES users(id),
  agent_name VARCHAR(255),
  conversation_id UUID REFERENCES conversations(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM provider configurations
CREATE TABLE IF NOT EXISTS llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  models JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_fallback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/llm/prompts
Create a new prompt template.

### GET /api/llm/prompts
List all prompt templates.

### GET /api/llm/prompts/:name
Get prompt template (latest version).

### GET /api/llm/prompts/:name/versions
List all versions of a prompt.

### POST /api/llm/prompts/:name/versions
Create a new version.

### PUT /api/llm/prompts/:name/rollback/:version
Rollback to a previous version.

### POST /api/llm/providers
Register a new LLM provider.

### GET /api/llm/providers
List all providers.

### PUT /api/llm/providers/:name
Update provider configuration.

### POST /api/llm/providers/:name/test
Test provider connectivity.

### GET /api/llm/usage
Get token usage and cost report.

### POST /api/llm/optimize
Optimize a prompt for token usage.

## WebSocket Events

- `llm:prompt:created` — New prompt template created
- `llm:prompt:versioned` — New version created
- `llm:providers:status` — Provider health update
- `llm:usage:threshold` — Cost threshold exceeded

## Guidelines

1. **Always version prompts** — Never edit a prompt in place; always create a new version.
2. **Use soul.md alignment** — Mark prompts with `useSoulAlignment: true` when behavioral alignment is needed.
3. **Monitor costs** — Set cost thresholds and alert when exceeded.
4. **Test providers regularly** — Run provider health checks every 5 minutes.
5. **Optimize before use** — Run prompts through the TokenOptimizer before sending to LLM.
6. **Document variables** — Every {placeholder} in a prompt template must be documented in `variables`.

## References

- See `references/prompt-examples.md` for prompt design patterns
- See `references/provider-configs.json` for default provider configs
- See `scripts/import-prompts.js` for batch prompt import
- See `scripts/cost-report.js` for cost report generation

## Examples

**Example 1: Create a versioned prompt**
```javascript
await PromptRegistry.create('agent-analysis', {
  description: 'Analyze user queries for agent routing',
  systemPrompt: 'You are an advanced query analyzer...',
  userTemplate: 'Query: {query}\nAnalyze and return JSON...',
  variables: [{ name: 'query', type: 'string', required: true }],
  provider: 'nim',
  model: 'deepseek-ai/deepseek-v4-flash',
});
```

**Example 2: Optimize a prompt**
```javascript
const optimized = await TokenOptimizer.optimize(longPrompt, {
  maxTokens: 2000,
  preserveVariables: true,
  strategy: 'smart-truncate',
});
```
