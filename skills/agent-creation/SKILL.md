---
name: agent-creation
description: Dynamic agent creation, registration, configuration, and lifecycle management. Use when the user wants to create a new agent, modify an existing agent, register capabilities, or manage the agent registry. Always align agent behavior with soul.md.
compatibility:
  requires:
    - AgentRegistry (agents/AgentRegistry.js)
    - Base Agent class (agents/base/Agent.js)
    - LLMManager (llm/providers/LLMManager.js)
  dependencies:
    - LLM & Prompt Management skill
---

# Agent Creation & Management Skill

This skill provides a complete framework for creating, registering, configuring, and managing AI agents in the Xro Agent ecosystem. All created agents should follow the behavioral framework defined in `soul.md`.

## Architecture Overview

```
Agent Creation System
├── AgentFactory          → Creates agent instances from definitions
├── AgentRegistry         → Manages agent lifecycle (existing)
├── AgentTemplate         → Agent definition schema
└── AgentManagerAPI       → REST endpoints + WebSocket events
```

## Agent Definition Schema

Every agent in the system is defined by this schema:

```javascript
{
  name: string,                        // Unique agent name
  type: string,                        // Agent type (main, web, code, database, search, custom)
  description: string,                 // What this agent does
  llmConfig: {
    provider: string,                  // LLM provider name
    model: string,                     // Model name
    temperature: number,               // 0.0 - 1.0
    maxTokens: number,                 // Max tokens per response
  },
  tools: string[],                     // Tool names to register
  capabilities: {                      // What this agent can do
    supportsParallel: boolean,
    supportsMemory: boolean,
    supportsCommunication: boolean,
    supportedTasks: string[],
  },
  config: {
    timeout: number,                   // ms
    maxRetries: number,
    useSoul: boolean,                  // Whether to use soul.md behavior
  },
  metadata: {                          // Optional metadata
    version: string,
    author: string,
    tags: string[],
  }
}
```

## Agent Templates

### Template: default-web-agent
```yaml
name: web-agent-{name}
type: web
description: Web scraping and data extraction agent
llmConfig:
  provider: nim
  model: meta/llama-3.3-70b-instruct
  temperature: 0.3
  maxTokens: 4096
tools:
  - web_search
  - http_client
  - dom_parser
capabilities:
  supportsParallel: false
  supportsMemory: true
  supportsCommunication: true
  supportedTasks:
    - web_scraping
    - data_extraction
    - form_submission
config:
  timeout: 25000
  maxRetries: 3
  useSoul: true
```

### Template: default-code-agent
```yaml
name: code-agent-{name}
type: code
description: Code execution, analysis, and debugging agent
llmConfig:
  provider: nim
  model: deepseek-ai/deepseek-v4-flash
  temperature: 0.2
  maxTokens: 8192
tools:
  - code_executor
  - syntax_validator
  - code_analyzer
capabilities:
  supportsParallel: false
  supportsMemory: true
  supportsCommunication: true
  supportedTasks:
    - code_execution
    - debugging
    - code_review
    - refactoring
config:
  timeout: 30000
  maxRetries: 3
  useSoul: true
```

## Creating an Agent

### Step 1: Define the Agent
Create an agent definition. Use an existing template or start fresh:

```
agent-creation create --name "my-custom-agent" --type "search" --template "default-search-agent"
```

### Step 2: Configure LLM
Set the LLM provider and model for the agent:
```
agent-creation set-llm "my-custom-agent" --provider "nim" --model "nvidia/nemotron-3-super-120b-a12b" --temperature 0.3
```

### Step 3: Register Tools
Associate tools with the agent:
```
agent-creation add-tool "my-custom-agent" --tool "web_search"
agent-creation add-tool "my-custom-agent" --tool "info_synthesis"
```

### Step 4: Register & Initialize
```javascript
const AgentFactory = require('./services/AgentFactory');
const agentRegistry = require('./agents/AgentRegistry');

const definition = { name: 'my-custom-agent', type: 'search', ... };
const agent = await AgentFactory.createAgent(definition);
await agentRegistry.register(definition.name, agent);
```

## API Endpoints

### POST /api/agents
Create a new agent from definition.

### GET /api/agents
List all registered agents and their capabilities.

### GET /api/agents/:name
Get agent details.

### PUT /api/agents/:name
Update agent configuration.

### DELETE /api/agents/:name
Unregister and clean up an agent.

### POST /api/agents/:name/execute
Execute a specific agent directly.

### GET /api/agents/registry/metrics
Get registry metrics (total agents, names, capabilities).

## WebSocket Events

- `agent:created` — New agent registered
- `agent:updated` — Agent configuration changed
- `agent:deleted` — Agent removed
- `agent:executing` — Agent started execution
- `agent:completed` — Agent finished execution
- `agent:error` — Agent encountered an error

## Database Schema

```sql
-- Agent definitions table
CREATE TABLE IF NOT EXISTS agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  llm_config JSONB DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent execution history
CREATE TABLE IF NOT EXISTS agent_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(255) NOT NULL,
  execution_id UUID,
  status VARCHAR(50) NOT NULL,
  input_query TEXT,
  output_response TEXT,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## Guidelines

1. **Always call soul.md** — Every new agent should have `useSoul: true` in config by default.
2. **Validate definitions** — Before creating, validate the definition against the schema.
3. **Graceful failure** — If an agent fails to initialize, log the error and return a clear message.
4. **Resource limits** — Enforce maximum agent count (configurable, default: 20).
5. **Naming convention** — Agent names should be lowercase, hyphen-separated, descriptive.
6. **Template override** — Users can override any template field when creating.

## References

- See `references/agent-templates.json` for all available templates
- See `references/agent-schema.json` for the full JSON Schema
- See `scripts/create-agent.js` for CLI automation
- See `scripts/migrate-agents.js` for database migration

## Examples

**Example 1: Create a custom research agent**
```
agent-creation create --name "research-agent" --type "search" \
  --template "default-search-agent" \
  --description "Deep research on technical topics" \
  --model "nvidia/nemotron-3-super-120b-a12b" \
  --tools "web_search,multi_source_search,info_synthesis"
```

**Example 2: Create a monitoring agent**
```
agent-creation create --name "system-monitor" --type "custom" \
  --description "Monitors system health and performance" \
  --capabilities "monitoring,alerting,reporting"
```
