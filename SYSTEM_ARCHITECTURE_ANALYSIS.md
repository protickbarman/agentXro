# XRO AGENT SYSTEM ARCHITECTURE - COMPREHENSIVE ANALYSIS

## EXECUTIVE SUMMARY

The Xro Agent system is a sophisticated multi-agent orchestration platform built on Node.js/Express, featuring 8 specialized skills, 15 core services, and 4 tools. All agents are governed by a behavioral framework defined in `soul.md`. The architecture follows a hierarchical delegation model with a MainAgent routing queries to specialized sub-agents.

---

## 1. EXISTING TOOLS ARCHITECTURE

### Tool Definition Location & Pattern
- **Directory**: `/tools/`
- **Base Class**: `/tools/base/Tool.js`
- **Registry**: `/tools/ToolRegistry.js` (Singleton pattern)
- **Tool Format**: All tools extend `Tool` base class

### Current Tools (4 Total)

```
tools/
├── base/
│   └── Tool.js              # Base class for all tools
├── shared/
│   ├── BasicWebSearchTool.js      # Web search via DuckDuckGo
│   ├── CalculatorTool.js          # Math calculations
│   ├── JSONParserTool.js          # JSON validation & formatting
│   └── TimerTool.js               # Timing operations
├── ToolRegistry.js          # Central tool registry (singleton)
```

### Tool Registry Pattern

```javascript
// Singleton instance - tools/ToolRegistry.js
class ToolRegistry {
  register(name, toolInstance)    // Register tool
  get(name)                       // Get tool by name
  has(name)                       // Check if exists
  getAll()                        // Get all tools
  getNames()                      // Get tool names array
  getSchemas()                    // Get all schemas
  getSchema(name)                 // Get specific schema
  clear()                         // Clear registry
}
```

### Tool Interface (Base Class)

```javascript
class Tool {
  constructor(name, schema = {})
  
  // Schema info
  getSchema()                     // Returns JSON schema
  
  // Validation & Execution
  validate(params)                // Validate parameters
  async execute(params)           // Execute tool
  async executeWithTimeout()      // Execute with timeout
  async executeWithRetry()        // Execute with automatic retries
  
  // Result Formatting
  formatResult(data)              // Format success result
  formatError(error)              // Format error result
}
```

### Tool Registration Pattern

```javascript
// config/toolInit.js
const toolRegistry = require('../tools/ToolRegistry');
const CalculatorTool = require('../tools/shared/CalculatorTool');

async function initializeTools() {
  toolRegistry.register('calculator', new CalculatorTool());
  toolRegistry.register('web_search', new BasicWebSearchTool());
  // ... more tools
  return toolRegistry;
}

module.exports = { initializeTools };
```

### Tool Usage in Routes

```javascript
// routes/tools.js
router.post('/:toolName/execute', authMiddleware, async (req, res) => {
  const tool = toolRegistry.get(toolName);
  const result = await tool.execute(params);
  // Return result
});
```

---

## 2. EXISTING 8 AGENT SKILLS

### Skill Directory Structure

```
skills/
├── README.md                              # Skills overview
├── agent-creation/
│   ├── SKILL.md                          # Skill definition
│   ├── scripts/
│   │   └── create-agent.js              # CLI: Create new agent
│   └── references/
│       └── agent-templates.json         # Available templates
├── job-queue-deployment/
│   ├── SKILL.md
│   └── scripts/
│       └── deploy-agent.js              # CLI: Deploy agent to queue
├── llm-prompt-management/
│   ├── SKILL.md
│   └── scripts/
│       ├── cost-report.js               # CLI: Cost reporting
│       └── import-prompts.js            # CLI: Bulk import prompts
├── external-integrations/
│   ├── SKILL.md
│   └── scripts/
│       └── test-integration.js          # CLI: Test integration
├── agent-memory/
│   ├── SKILL.md
│   └── scripts/
│       └── consolidate-memories.js      # CLI: Consolidate memories
├── agent-communication/
│   └── SKILL.md                         # (No scripts for this skill)
├── code-execution-visualization/
│   ├── SKILL.md
│   └── scripts/
│       └── run-code.js                  # CLI: Execute code
└── pause-resume-execution/
    ├── SKILL.md
    └── scripts/
        └── recover-executions.js        # CLI: Recover paused executions
```

### SKILL.md Format (Standard)

All SKILL.md files follow this format:

```yaml
---
name: skill-name
description: What this skill does
compatibility:
  requires:
    - Dependency 1
    - Dependency 2
  dependencies:
    - Optional dependency
---

# Skill Name

[Markdown documentation]

## Architecture Overview
[System diagram]

## Schema Definitions
[Data structures]

## API Endpoints
[REST endpoints provided by this skill]

## WebSocket Events
[Real-time events]

## Database Schema
[SQL CREATE TABLE statements]

## Guidelines
[Best practices]

## References
[Links to scripts and examples]

## Examples
[Code examples]
```

### 8 Skills Summary

| # | Skill | Purpose | Core Service | Scripts |
|---|-------|---------|--------------|---------|
| 1 | agent-creation | Create, register, configure agents | AgentFactory | create-agent.js |
| 2 | job-queue-deployment | Job scheduling, deployment, monitoring | QueueManager | deploy-agent.js |
| 3 | llm-prompt-management | Prompt versioning, token optimization | PromptRegistry, TokenOptimizer, CostTracker | import-prompts.js, cost-report.js |
| 4 | external-integrations | Slack, GitHub, Discord, Jira integrations | IntegrationManager | test-integration.js |
| 5 | agent-memory | Persistent cross-session memory | MemoryManager | consolidate-memories.js |
| 6 | agent-communication | Agent-to-agent messaging, delegation | AgentMessenger, TaskDelegator | (none) |
| 7 | code-execution-visualization | Safe code execution, visualizations | SandboxManager, VisualizationEngine | run-code.js |
| 8 | pause-resume-execution | Execution lifecycle: pause, resume, cancel | ExecutionManager | recover-executions.js |

---

## 3. SUBAGENT ARCHITECTURE

### Agent Class Hierarchy

```
agents/
├── AgentRegistry.js              # Central registry (singleton)
├── base/
│   ├── Agent.js                 # Base Agent class
│   └── AgentConfig.js           # Configuration schema
├── main/
│   ├── MainAgent.js             # Central orchestrator
│   └── config.js                # MainAgent config
├── web/
│   ├── WebAgent.js              # Web scraping agent
│   └── config.js
├── code/
│   ├── CodeAgent.js             # Code execution agent
│   └── config.js
├── database/
│   ├── DatabaseAgent.js         # Database query agent
│   └── config.js
└── search/
    ├── SearchAgent.js           # Search/research agent
    └── config.js
```

### Base Agent Class

```javascript
class Agent {
  constructor(name, type = 'base')
  
  // Initialization
  async initialize(config = {})
  
  // LLM & Tools
  setLLMProvider(provider)
  registerTool(tool)
  getCapabilities()
  
  // Execution
  async execute(context)          // Must implement in subclass
  
  // Communication
  async sendMessage(targetAgent, message)
  async receiveMessage(sourceAgent, message)
  
  // Response Formatting
  formatResponse(data, message)
  formatError(error)
}
```

### MainAgent Task Delegation Flow

```javascript
// agents/main/MainAgent.js
class MainAgent extends Agent {
  async execute(context) {
    // 1. Analyze query complexity
    const analysis = await this._analyzeQuery(userMessage, conversationHistory);
    
    // 2. Route decision
    if (analysis.shouldUseDirectTools) {
      // Simple query → Execute directly with tools
      result = await this._executeWithTools(userMessage, analysis, conversationId);
    } else {
      // Complex query → Delegate to sub-agents
      result = await this._delegateToSubAgents(
        userMessage, 
        analysis, 
        conversationHistory, 
        conversationId
      );
    }
    
    // 3. Stream results back via WebSocket
    return formattedResponse;
  }
}
```

### Sub-Agent Types (5 Total)

```javascript
// Registered in config/agentInit.js

MainAgent       - Orchestrator, routes queries
WebAgent        - Web scraping, data extraction
CodeAgent       - Code execution, debugging
DatabaseAgent   - SQL queries, data analysis
SearchAgent     - Information retrieval, research
```

### AgentRegistry Pattern

```javascript
class AgentRegistry {
  setMainAgent(agent)             // Set the main/master agent
  register(name, agent)           // Register an agent
  get(name)                       // Get agent by name
  has(name)                       // Check if exists
  getMainAgent()                  // Get main agent
  getNames()                      // Get all agent names
  getInfo()                       // Get info on all agents
  getMetrics()                    // Get performance metrics
}
```

### Task Delegation Pattern

```javascript
// TaskDelegator - Inter-agent communication
class TaskDelegator {
  async delegate(fromAgent, task) {
    // 1. Validate target agent exists
    // 2. Create delegation record
    // 3. Send message via AgentMessenger
    // 4. Store in task_delegations table
    // 5. Return delegation ID
  }
}

// AgentMessenger - Direct agent-to-agent messages
class AgentMessenger {
  async send(fromAgent, toAgent, message) {
    // 1. Format message
    // 2. Call target agent's receiveMessage()
    // 3. Return response
    // 4. Log in agent_messages table
  }
}
```

---

## 4. SERVICES LAYER (15 Core Services)

### Services Directory Structure

```
services/
├── AgentFactory.js              # Create agents from definitions
├── AgentMessenger.js            # Agent-to-agent messaging
├── AuthService.js               # Authentication (not singleton)
├── CollaborationManager.js      # Multi-agent workflows
├── ConflictResolver.js          # Resolve agent conflicts
├── CostTracker.js               # LLM token/cost tracking
├── ExecutionManager.js          # Execution lifecycle: pause/resume
├── IntegrationManager.js         # External service integrations
├── MemoryManager.js             # Persistent agent memories
├── PromptRegistry.js            # Prompt template versioning
├── SandboxManager.js            # Secure code execution
├── TaskDelegator.js             # Inter-agent task delegation
├── TokenOptimizer.js            # Token optimization
├── VisualizationEngine.js       # Data visualization generation
└── integrations/
    ├── DiscordClient.js         # Discord integration
    ├── GitHubClient.js          # GitHub integration
    ├── JiraClient.js            # Jira integration
    └── SlackClient.js           # Slack integration
```

### Service Pattern (Singleton)

All services are singletons exported as single instances:

```javascript
// Example: MemoryManager.js
class MemoryManager {
  async store(memory) { ... }
  async get(key) { ... }
  async search(query, options) { ... }
  // ... methods
}

module.exports = new MemoryManager();  // SINGLETON
```

### 15 Core Services Summary

| Service | Skill | Purpose | Key Methods |
|---------|-------|---------|-------------|
| **AgentFactory** | agent-creation | Create agents from definitions | createAgent(), createFromTemplate() |
| **AgentMessenger** | agent-communication | Agent-to-agent messaging | send(from, to, message) |
| **TaskDelegator** | agent-communication | Delegate tasks between agents | delegate(from, task) |
| **MemoryManager** | agent-memory | Store/retrieve persistent memories | store(), get(), search(), consolidate() |
| **PromptRegistry** | llm-prompt-management | Manage prompt templates | create(), get(), getVersion(), update() |
| **TokenOptimizer** | llm-prompt-management | Optimize token usage | optimize() |
| **CostTracker** | llm-prompt-management | Track LLM costs | trackUsage(), getReport() |
| **ExecutionManager** | pause-resume-execution | Control execution lifecycle | start(), pause(), resume(), cancel() |
| **SandboxManager** | code-execution-visualization | Safe code execution | create(), execute(), cleanup() |
| **VisualizationEngine** | code-execution-visualization | Generate visualizations | generate() |
| **IntegrationManager** | external-integrations | Manage external integrations | register(), send(), receive() |
| **CollaborationManager** | agent-communication | Multi-agent workflows | createWorkflow(), execute() |
| **ConflictResolver** | agent-communication | Resolve agent disagreements | resolve() |
| **AuthService** | (core) | Authentication | authenticate(), verify() |
| **QueueManager** | job-queue-deployment | Job queue management | addJob(), processJob() |

### Service Integration Example

```javascript
// How a skill's service integrates with other parts

// 1. In SKILL.md
dependencies:
  - LLM & Prompt Management skill
  - Agent Memory skill

// 2. In the service (e.g., MemoryManager.js)
const PromptRegistry = require('./PromptRegistry');
const { query } = require('../config/database');

class MemoryManager {
  async store(memory) {
    // Use database
    // Reference PromptRegistry if needed for templates
  }
}

// 3. Used in routes
const MemoryManager = require('../services/MemoryManager');
router.post('/memory', async (req, res) => {
  const result = await MemoryManager.store(req.body);
});

// 4. Used in agents
const MemoryManager = require('../services/MemoryManager');
class MyAgent extends Agent {
  async execute(context) {
    const memories = await MemoryManager.search(context.query);
    // Use memories in LLM prompt
  }
}
```

---

## 5. INTEGRATION POINTS - HOW SKILLS CONNECT TO SERVICES

### Pattern 1: Service → Skill → API

```
Service (MemoryManager)
  ↓
Database Table (agent_memories)
  ↓
API Endpoint (GET /api/memory/search)
  ↓
Route Handler (routes/memory.js - TO BE CREATED)
  ↓
REST/WebSocket Client
```

### Pattern 2: Skill → Service → Skill (Cross-skill dependency)

```
agent-memory skill
  ├─ MemoryManager service
  │   ├─ Stores in agent_memories table
  │   └─ Uses llm-prompt-management for retrieving memories
  │
  └─ Referenced by:
      ├─ agent-communication (retrieves context before delegating)
      ├─ code-execution-visualization (caches visualization results)
      └─ external-integrations (stores integration responses)
```

### Pattern 3: Script → Service → Database

```
skills/agent-memory/scripts/consolidate-memories.js
  ↓
require('../services/MemoryManager')
  ↓
MemoryManager.consolidate()
  ↓
UPDATE agent_memories table
  ↓
INSERT memory_consolidation_log
```

### Example: Complete Integration Flow

**Agent Memory Skill Integration:**

```
1. SKILL.md (agent-memory)
   - Defines API endpoints: POST /api/memory, GET /api/memory/search
   - Lists database tables needed
   - References consolidate-memories.js script

2. Service (MemoryManager.js)
   - Implements all memory operations
   - Queries database
   - Manages cache

3. Route (routes/memory.js - TO BE CREATED)
   - POST /api/memory → MemoryManager.store()
   - GET /api/memory/search → MemoryManager.search()
   - Uses authentication middleware

4. Controller (controllers/memoryController.js - TO BE CREATED)
   - Parse request params
   - Validate input
   - Call MemoryManager service
   - Handle errors
   - Return response

5. Script (skills/agent-memory/scripts/consolidate-memories.js)
   - CLI: node consolidate-memories.js --user-id <id>
   - Calls MemoryManager.consolidate()
   - Prints progress

6. Usage in Agents
   - MainAgent loads relevant memories before delegating
   - Sub-agents use memories in context
   - Agents automatically extract new memories from responses
```

---

## 6. TOOL USAGE PATTERNS

### How Tools Are Currently Used

#### Pattern 1: Direct Tool Execution in Agent

```javascript
// agents/main/MainAgent.js
async _executeWithTools(userMessage, analysis, conversationId) {
  const tools = this.toolRegistry.getSchemas();
  
  // Get tool schema for LLM
  const toolSchemas = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  
  // LLM decides which tool to use
  const response = await this.llmProvider.generate({
    systemPrompt: `You have access to tools: ${JSON.stringify(toolSchemas)}`,
    userPrompt: userMessage,
    tools: toolSchemas,
  });
  
  // If LLM decides to use a tool:
  if (response.toolCall) {
    const tool = this.toolRegistry.get(response.toolCall.name);
    const result = await tool.executeWithRetry(response.toolCall.params);
    return result;
  }
}
```

#### Pattern 2: Tool Registration with Agents

```javascript
// config/agentInit.js
const toolRegistry = require('../tools/ToolRegistry');

async function initializeAgents(llmManager) {
  const mainAgent = new MainAgent(llmManager, toolRegistry, agentRegistry);
  
  // Agent has access to tool registry
  // Can call: toolRegistry.get('tool_name')
}
```

#### Pattern 3: Tool Execution via REST API

```javascript
// routes/tools.js
router.post('/:toolName/execute', authMiddleware, async (req, res) => {
  const tool = toolRegistry.get(toolName);
  const result = await tool.executeWithRetry(params);
  res.json(result);
});
```

### Current Tool Calling Pattern

Tools use a schema-based approach where:
1. Each tool has a JSON schema describing inputs/outputs
2. LLM sees all tool schemas
3. LLM decides which tool to use and with what params
4. Tool is executed with retry logic and timeout

```javascript
// Tool schema example
{
  name: 'web_search',
  description: 'Performs basic web search using DuckDuckGo API',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      maxResults: { type: 'number', description: 'Max results' },
    },
    required: ['query'],
  },
}
```

---

## 7. DIRECTORY TREE - COMPLETE

```
/home/xro/Desktop/Xro Agent/
├── skills/                          # 8 Agent Skills
│   ├── README.md                   # Skills overview
│   ├── agent-creation/
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   └── create-agent.js
│   │   └── references/
│   │       └── agent-templates.json
│   ├── job-queue-deployment/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── deploy-agent.js
│   ├── llm-prompt-management/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── cost-report.js
│   │       └── import-prompts.js
│   ├── external-integrations/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── test-integration.js
│   ├── agent-memory/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── consolidate-memories.js
│   ├── agent-communication/
│   │   └── SKILL.md
│   ├── code-execution-visualization/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── run-code.js
│   └── pause-resume-execution/
│       ├── SKILL.md
│       └── scripts/
│           └── recover-executions.js
│
├── services/                        # 15 Core Services (singletons)
│   ├── AgentFactory.js
│   ├── AgentMessenger.js
│   ├── AuthService.js
│   ├── CollaborationManager.js
│   ├── ConflictResolver.js
│   ├── CostTracker.js
│   ├── ExecutionManager.js
│   ├── IntegrationManager.js
│   ├── MemoryManager.js
│   ├── PromptRegistry.js
│   ├── SandboxManager.js
│   ├── TaskDelegator.js
│   ├── TokenOptimizer.js
│   ├── VisualizationEngine.js
│   └── integrations/
│       ├── DiscordClient.js
│       ├── GitHubClient.js
│       ├── JiraClient.js
│       └── SlackClient.js
│
├── tools/                          # 4 Tools + Registry
│   ├── ToolRegistry.js            # Singleton registry
│   ├── base/
│   │   └── Tool.js                # Base class
│   └── shared/
│       ├── BasicWebSearchTool.js
│       ├── CalculatorTool.js
│       ├── JSONParserTool.js
│       └── TimerTool.js
│
├── agents/                         # Agent Orchestration
│   ├── AgentRegistry.js           # Singleton registry
│   ├── base/
│   │   ├── Agent.js               # Base class
│   │   └── AgentConfig.js
│   ├── main/
│   │   ├── MainAgent.js           # Orchestrator
│   │   └── config.js
│   ├── web/
│   │   ├── WebAgent.js
│   │   └── config.js
│   ├── code/
│   │   ├── CodeAgent.js
│   │   └── config.js
│   ├── database/
│   │   ├── DatabaseAgent.js
│   │   └── config.js
│   └── search/
│       ├── SearchAgent.js
│       └── config.js
│
├── routes/                         # API Routes
│   ├── agents.js
│   ├── analytics.js
│   ├── auth.js
│   ├── conversations.js
│   ├── messages.js
│   ├── tools.js
│   └── ai.js
│
├── controllers/                    # Request Handlers
│   ├── aiController.js
│   ├── authController.js
│   ├── conversationsController.js
│   └── messagesController.js
│
├── models/                         # Database Models
│   ├── Conversation.js
│   ├── Message.js
│   ├── ToolExecution.js
│   └── ...
│
├── config/                         # Configuration
│   ├── agentInit.js               # Initialize agents
│   ├── toolInit.js                # Initialize tools
│   ├── database.js
│   ├── logger.js
│   ├── redis.js
│   ├── env.js
│   └── constants.js
│
├── llm/                           # LLM Providers
│   └── providers/
│       └── LLMManager.js
│
├── queue/                         # Job Queue (Bull)
│   └── QueueManager.js
│
├── middleware/                    # Express Middleware
│   └── auth.js
│
├── utils/                         # Utilities
│   ├── errorTypes.js
│   ├── retry.js
│   ├── tokenCounter.js
│   ├── validation.js
│   └── ...
│
├── index.js                       # Main Express app
├── soul.md                        # Behavioral framework
├── package.json
└── ...
```

---

## 8. COMPLETE SKILL EXAMPLE: Agent Memory Skill

### 8a. SKILL.md Structure

```yaml
---
name: agent-memory
description: Persistent memory system for agents...
compatibility:
  requires:
    - PostgreSQL
  dependencies:
    - LLM & Prompt Management skill
---

# Content covers:
- Architecture Overview (diagram)
- Memory Types (5 types)
- Memory Schema (data structure)
- Memory Operations (store, retrieve, search, update, delete)
- Memory Consolidation Strategies
- Database Schema (SQL)
- API Endpoints (REST)
- WebSocket Events
- Guidelines
- References to scripts and examples
```

### 8b. Service Implementation

```javascript
// services/MemoryManager.js
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 60000;
  }

  // Store a memory
  async store(memory) {
    // INSERT into agent_memories table
    // Invalidate cache
    // Return stored memory
  }

  // Get by key
  async get(key, options = {}) {
    // SELECT from agent_memories WHERE memory_key = key
  }

  // Search semantically
  async search(query, options = {}) {
    // Vector similarity search
    // Filter by user, scope, type, etc.
  }

  // Consolidate memories
  async consolidate(options = {}) {
    // Merge similar memories
    // Prune low-importance
    // Update confidence scores
  }

  // Private cache management
  _getCache(key) { ... }
  _setCache(key, value, ttl) { ... }
  _invalidateCache(userId) { ... }
}

module.exports = new MemoryManager();
```

### 8c. Script Implementation

```javascript
// skills/agent-memory/scripts/consolidate-memories.js
#!/usr/bin/env node

const MemoryManager = require('../../services/MemoryManager');

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  
  if (!opts['user-id']) {
    console.error('Usage: node consolidate-memories.js --user-id <id>');
    process.exit(1);
  }

  try {
    const result = await MemoryManager.consolidate({
      userId: opts['user-id'],
      strategy: opts.strategy || 'prune',
      minImportance: parseInt(opts['min-importance'] || '3'),
    });

    console.log('✓ Consolidation complete:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Merged:    ${result.merged}`);
    console.log(`  Pruned:    ${result.pruned}`);
  } catch (err) {
    console.error('Consolidation failed:', err.message);
    process.exit(1);
  }
}

main();
```

### 8d. Database Tables

```sql
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  memory_key VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  importance INTEGER DEFAULT 5,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  agent_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 8e. API Endpoints (Proposed)

```
GET    /api/memory/:key                      Get memory by key
GET    /api/memory/search?q=...              Search memories
GET    /api/memory/user/:userId              Get user's memories
POST   /api/memory                           Create memory
PUT    /api/memory/:id                       Update memory
DELETE /api/memory/:id                       Delete memory
POST   /api/memory/consolidate               Run consolidation
GET    /api/memory/context/:conversationId   Get context
```

### 8f. Integration with Agents

```javascript
// In any agent's execute method:
const MemoryManager = require('../services/MemoryManager');

async execute(context) {
  // 1. Load relevant memories
  const memories = await MemoryManager.search(context.query, {
    userId: context.userId,
    limit: 5,
  });

  // 2. Inject into prompt
  const memoryContext = memories
    .map(m => `[Memory: ${m.key}] ${m.content.text}`)
    .join('\n');

  // 3. Generate response with LLM using memories
  const response = await this.llmProvider.generate({
    systemPrompt: `Context:\n${memoryContext}\n\nCurrent query:`,
    userPrompt: context.query,
  });

  // 4. Extract and store new memories
  await this._extractMemories(response, context);
}
```

---

## 9. HOW SKILLS ARE DISCOVERED

### Skill Discovery Process

1. **Static Discovery** - Hardcoded in `/skills/README.md`
2. **Dynamic Discovery** - Could be implemented via:
   - File scanning for `SKILL.md` files
   - Database registry of skills
   - Agent Skills Protocol XML

### Current Implementation

Agents reference skills by name in their SKILL.md files under `dependencies` section:

```yaml
# In a skill's SKILL.md
dependencies:
  - LLM & Prompt Management skill     # Explicit reference
  - Agent Memory skill                # Must be loaded first
```

### Proposed Protocol

Agent Skills Protocol compatible XML:

```xml
<available_skills>
  <skill>
    <name>agent-memory</name>
    <description>Persistent memory system...</description>
    <location>/skills/agent-memory/SKILL.md</location>
    <version>1.0.0</version>
  </skill>
</available_skills>
```

---

## 10. SUBAGENT INSTRUCTION FLOW

### How MainAgent Routes Queries

```
User Message
    ↓
1. MainAgent.execute(context)
    ↓
2. Analyze query complexity
    ├─ SimpleQuery? → shouldUseDirectTools = true
    └─ ComplexQuery? → shouldUseDirectTools = false
    ↓
3a. IF Direct Tools:
    ├─ Get tool schemas
    ├─ Call LLM with tools available
    ├─ LLM chooses tool
    ├─ Execute tool
    └─ Return result
    ↓
3b. IF Delegate:
    ├─ Determine required agents (web, code, search, etc.)
    ├─ For each recommended agent:
    │   ├─ TaskDelegator.delegate(mainAgent, {
    │   │     task: userMessage,
    │   │     assignee: agentName,
    │   │     context: conversationHistory,
    │   │   })
    │   ├─ AgentMessenger sends task to agent
    │   ├─ Agent executes
    │   └─ Result returned
    ├─ Synthesize results
    └─ Return combined response
    ↓
4. Format response
    ↓
5. Stream via WebSocket to client
```

### Agent Subagent Instruction Format

When delegating to a sub-agent:

```javascript
// TaskDelegator.delegate()
const delegation = {
  id: UUID,
  fromAgent: 'main',
  toAgent: 'web',              // Target agent name
  task: 'Find information about X',
  context: {
    conversationId: '...',
    userId: '...',
    conversationHistory: [...],  // For context
    requiredCapabilities: ['web_scraping', 'data_extraction'],
    priority: 'high',
  },
  deadline: null,
  maxRetries: 3,
};

// Sent to agent via AgentMessenger.send()
await AgentMessenger.send('main', 'web', {
  intent: 'task_execution',
  payload: delegation,
  format: 'json',
  metadata: { priority: 'high', isDelegation: true },
});
```

### Soul.md Integration in Execution

Before executing ANY task, agents should:

```javascript
// Agent execution with soul.md alignment
async execute(context) {
  // 1. Load soul.md principles
  const soul = await loadSoul();
  
  // 2. Understand context (CURIOSITY)
  const analysis = await this.analyze(context);
  
  // 3. Think step-by-step (THOUGHTFULNESS)
  const plan = await this.plan(analysis);
  
  // 4. Communicate progress (EMPATHY)
  await this.communicate(context, 'Starting task analysis...');
  
  // 5. Execute with soul alignment
  const result = await this.executeWithSoul(plan);
  
  // 6. Own mistakes if any (HONESTY)
  if (result.error) {
    await this.handleError(result.error);
  }
  
  // 7. Reflect and learn (GROWTH)
  await this.reflect(result);
  
  return result;
}
```

---

## 11. LIST OF 17 SERVICES

Wait, the analysis shows 15 services, not 17. Here they are:

| # | Service | File | Type | Purpose |
|---|---------|------|------|---------|
| 1 | AgentFactory | services/AgentFactory.js | Singleton | Create agents from definitions |
| 2 | AgentMessenger | services/AgentMessenger.js | Singleton | Agent-to-agent messaging |
| 3 | AuthService | services/AuthService.js | Class | Authentication |
| 4 | CollaborationManager | services/CollaborationManager.js | Singleton | Multi-agent workflows |
| 5 | ConflictResolver | services/ConflictResolver.js | Singleton | Resolve agent conflicts |
| 6 | CostTracker | services/CostTracker.js | Singleton | Track LLM costs |
| 7 | ExecutionManager | services/ExecutionManager.js | Singleton | Pause/resume/cancel execution |
| 8 | IntegrationManager | services/IntegrationManager.js | Singleton | External service management |
| 9 | MemoryManager | services/MemoryManager.js | Singleton | Persistent agent memory |
| 10 | PromptRegistry | services/PromptRegistry.js | Singleton | Prompt template versioning |
| 11 | SandboxManager | services/SandboxManager.js | Singleton | Secure code execution |
| 12 | TaskDelegator | services/TaskDelegator.js | Singleton | Task delegation |
| 13 | TokenOptimizer | services/TokenOptimizer.js | Singleton | Token optimization |
| 14 | VisualizationEngine | services/VisualizationEngine.js | Singleton | Visualization generation |
| 15 | QueueManager | queue/QueueManager.js | External | Job queue (Bull) |

Integration Clients (subservices under IntegrationManager):
- DiscordClient
- GitHubClient
- JiraClient
- SlackClient

---

## 12. SUMMARY & KEY TAKEAWAYS

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              SKILL LAYER (8 Skills)                     │
│  ┌─ agent-creation  ┌─ job-queue-deployment           │
│  ├─ llm-prompt-mgmt ├─ external-integrations           │
│  ├─ agent-memory    ├─ agent-communication             │
│  ├─ code-execution  └─ pause-resume-execution          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│          SERVICE LAYER (15 Services)                    │
│     Each service is a Singleton exported as instance    │
│     Example: module.exports = new MemoryManager()       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         AGENT ORCHESTRATION LAYER                       │
│  MainAgent → Routes to sub-agents or direct tools       │
│  SubAgents: Web, Code, Database, Search                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│           TOOLS LAYER (4 Tools + Registry)              │
│  All tools extend Tool base class                       │
│  Registered in ToolRegistry singleton                   │
└─────────────────────────────────────────────────────────┘
```

### Key Patterns

1. **Singleton Services** - All services are instantiated once globally
2. **Tool Registry Pattern** - Tools registered at startup, accessed by agents
3. **Agent Registry Pattern** - Agents registered at startup, routed to by MainAgent
4. **Task Delegation** - MainAgent uses TaskDelegator to send work to sub-agents
5. **Skill → Service → Database** - Skills define behavior, services implement, DB stores
6. **Soul.md Alignment** - All agents should follow behavioral guidelines in soul.md

### Compatibility for New Additions

When adding new skills/services:
1. Create SKILL.md in skills/ with proper YAML frontmatter
2. Implement service(s) in services/ following singleton pattern
3. Create scripts in skills/{name}/scripts/ for CLI automation
4. Add database tables to SKILL.md
5. Add API endpoints to skills/{name}/SKILL.md (and later implement in routes/)
6. Reference in agent execution or skill dependencies
7. Register in appropriate config file (toolInit.js or agentInit.js)

