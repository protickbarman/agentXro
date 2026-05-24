---
name: agent-communication
description: Direct agent-to-agent communication and coordination framework. Use when agents need to delegate tasks to each other, share information, collaborate on multi-step workflows, or resolve conflicts between agents.
compatibility:
  requires:
    - Agent base class (agents/base/Agent.js)
    - AgentRegistry (agents/AgentRegistry.js)
    - WebSocket support
  dependencies:
    - Agent Memory skill (for shared context)
    - Agent Creation skill (for agent availability)
---

# Agent-to-Agent Communication Skill

This skill enables direct communication, task delegation, and collaboration between agents in the Xro ecosystem.

## Architecture Overview

```
Agent Communication
├── AgentMessenger          → Message routing between agents
├── MessageBus              → Pub/sub message distribution
├── TaskDelegator           → Task assignment and tracking
├── CollaborationManager    → Multi-agent workflow orchestration
├── ConflictResolver        → Resolution of agent disagreements
└── CommunicationAPI        → REST + WebSocket endpoints
```

## Communication Protocol

Agents communicate using a structured message protocol:

```javascript
{
  id: UUID,
  type: 'request' | 'response' | 'broadcast' | 'error',
  from: string,                    // Source agent name
  to: string | string[],           // Target agent(s)
  conversation: {
    id: UUID,                      // Shared conversation ID
    context: string,               // Current task context
  },
  content: {
    intent: string,                 // Purpose of the message
    payload: any,                   // Actual data
    format: 'text' | 'json' | 'code' | 'result',
  },
  metadata: {
    priority: 'low' | 'medium' | 'high',
    ttl: number,                   // Time-to-live in ms
    correlationId: UUID,           // For request-response matching
    requiresResponse: boolean,
  },
  timestamp: Date,
}
```

## Message Patterns

### 1. Request-Response (Direct)
One agent asks another for specific work:

```javascript
// CodeAgent asks SearchAgent for information
const response = await AgentMessenger.send('code-agent', 'search-agent', {
  intent: 'find_information',
  payload: {
    query: 'latest Python async patterns',
    sources: ['docs.python.org', 'stackoverflow'],
    maxResults: 5,
  },
  metadata: { priority: 'high', requiresResponse: true },
});

// Response
// {
//   results: [{ title: '...', url: '...', snippet: '...' }],
//   confidence: 0.92,
// }
```

### 2. Broadcast (One-to-Many)
An agent broadcasts to all agents:

```javascript
await AgentMessenger.broadcast('main-agent', {
  intent: 'task_available',
  payload: {
    taskType: 'data_analysis',
    complexity: 'medium',
    estimatedTime: 10000,
  },
  metadata: { priority: 'medium' },
});
```

### 3. Delegate (Task Assignment)
MainAgent delegates subtasks:

```javascript
const TaskDelegator = require('./services/TaskDelegator');

const subtask = await TaskDelegator.delegate('main-agent', {
  task: 'Analyze database schema and generate migration',
  assignee: 'database-agent',
  context: { conversationId: 'conv-123', userId: 'user-456' },
  deadline: new Date(Date.now() + 30000),
  requiredCapabilities: ['query_builder', 'schema_analyzer'],
});

// Track completion
subtask.on('completed', (result) => {
  console.log('Subtask completed:', result);
});
```

### 4. Collaborate (Multi-Agent Workflow)
Multiple agents work together on a shared task:

```javascript
const CollaborationManager = require('./services/CollaborationManager');

const workflow = await CollaborationManager.startWorkflow({
  name: 'full-stack-analysis',
  agents: ['web-agent', 'code-agent', 'database-agent', 'search-agent'],
  task: {
    description: 'Analyze website, extract data, and generate report',
    steps: [
      { agent: 'web-agent', task: 'Scrape website structure and content' },
      { agent: 'search-agent', task: 'Research similar websites and competitors' },
      { agent: 'database-agent', task: 'Store scraped data in structured format' },
      { agent: 'code-agent', task: 'Generate analysis report from all data' },
    ],
    aggregation: 'sequential',    // sequential | parallel | custom
    outputFormat: 'report',
  },
});

workflow.on('step:completed', (step) => {
  console.log(`Step ${step.agent} completed`);
});

const result = await workflow.waitForCompletion();
```

## Agent Messenger

### Core Methods
```javascript
// Send direct message
AgentMessenger.send(from, to, message);

// Send and wait for response
AgentMessenger.sendAndWait(from, to, message, timeoutMs);

// Broadcast to all agents of a type
AgentMessenger.broadcastByType(from, 'search', message);

// Broadcast to all agents
AgentMessenger.broadcastAll(from, message);

// Reply to a message
AgentMessenger.reply(originalMessage, response);

// Check if agent is available
AgentMessenger.isAvailable(agentName);
```

### Agent to Agent Communication

```javascript
// In any agent's execute method:
class ResearchAgent extends Agent {
  async execute(context) {
    // Ask search agent for initial data
    const searchResults = await this.sendMessage('search-agent', {
      intent: 'research',
      payload: { query: context.query, depth: 'deep' },
    });

    // Ask code agent to analyze the data
    const analysis = await this.sendMessage('code-agent', {
      intent: 'analyze_data',
      payload: { data: searchResults.results, analysisType: 'trend' },
    });

    // Return combined result
    return this.formatResponse({
      findings: searchResults.summary,
      analysis: analysis.insights,
      recommendations: analysis.recommendations,
    });
  }
}
```

## Task Delegation

### Delegate Task
```javascript
const delegation = await TaskDelegator.delegate(fromAgent, {
  task: description,
  assignee: targetAgent,
  context: { conversationId, userId },
  deadline: timestamp,
  requiredCapabilities: ['cap1', 'cap2'],
  priority: 'high',
  maxRetries: 3,
});
```

### Handle Delegation (in target agent)
```javascript
class DatabaseAgent extends Agent {
  async receiveMessage(sourceAgent, message) {
    if (message.intent === 'query_database') {
      return await this._handleQuery(message.payload);
    }
    if (message.intent === 'analyze_schema') {
      return await this._handleSchemaAnalysis(message.payload);
    }
    return super.receiveMessage(sourceAgent, message);
  }
}
```

## Conflict Resolution

When agents disagree, use the ConflictResolver:

```javascript
const ConflictResolver = require('./services/ConflictResolver');

const resolution = await ConflictResolver.resolve({
  issue: 'Different analysis conclusions',
  agents: {
    'code-agent': { conclusion: 'Use async/await', confidence: 0.8, evidence: '...' },
    'search-agent': { conclusion: 'Use promises', confidence: 0.6, evidence: '...' },
  },
  resolutionStrategy: 'evidence-based', // evidence-based | vote | escalate-to-user
  context: { conversationId: 'conv-123' },
});

// resolution = { decision: 'Use async/await', reasoning: '...', confidence: 0.85 }
```

## Database Schema

```sql
-- Agent messages log
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type VARCHAR(50) NOT NULL,
  from_agent VARCHAR(255) NOT NULL,
  to_agent VARCHAR(255)[] NOT NULL,
  intent VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'sent',
  correlation_id UUID,
  conversation_id UUID,
  requires_response BOOLEAN DEFAULT false,
  responded_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration workflows
CREATE TABLE IF NOT EXISTS collaboration_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  steps JSONB NOT NULL DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Task delegations
CREATE TABLE IF NOT EXISTS task_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent VARCHAR(255) NOT NULL,
  to_agent VARCHAR(255) NOT NULL,
  task_description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  result JSONB,
  priority VARCHAR(20) DEFAULT 'medium',
  retry_count INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## API Endpoints

### POST /api/agents/communicate
Send a message from one agent to another.

### POST /api/agents/delegate
Delegate a task to a specific agent.

### GET /api/agents/messages
Get message history between agents.

### POST /api/agents/collaborate
Start a multi-agent collaboration workflow.

### GET /api/agents/collaborate/:id
Get workflow status.

### POST /api/agents/conflicts/resolve
Resolve an agent conflict.

## WebSocket Events

- `agent:message:sent` — Message sent between agents
- `agent:message:received` — Agent received a message
- `agent:delegated` — Task delegated to agent
- `agent:delegation:completed` — Delegated task completed
- `agent:collaboration:started` — Workflow started
- `agent:collaboration:step` — Workflow step completed
- `agent:collaboration:completed` — Workflow finished
- `agent:conflict:detected` — Agent conflict needs resolution
- `agent:conflict:resolved` — Conflict resolved

## Guidelines

1. **Always include context** — When delegating, include conversationId and userId for traceability.
2. **Set appropriate timeouts** — Request-response messages should have a TTL commensurate with task complexity.
3. **Handle agent unavailability** — If an agent is busy, queue the message or try another agent.
4. **Log all communications** — Every message between agents should be logged for debugging.
5. **Avoid circular delegation** — Detect and prevent A→B→A patterns.
6. **Use correlation IDs** — Always set correlationId for request-response matching.
7. **Graceful timeout** — If an agent doesn't respond in time, retry or escalate.

## References

- See `references/communication-patterns.md` for detailed communication patterns
- See `references/workflow-templates.json` for workflow templates
- See `scripts/monitor-communication.js` for communication monitoring

## Examples

**Example 1: Research pipeline**
```
SearchAgent finds data → CodeAgent analyzes → DatabaseAgent stores → MainAgent summarizes
↓                              ↓                              ↓
Search results          Analysis report            Stored results
↓                              ↓                              ↓
All fed into MainAgent → Final response to user
```

**Example 2: Parallel investigation**
```
User asks: "Is our website secure?"
MainAgent delegates:
  ├── WebAgent: Scan website endpoints
  ├── CodeAgent: Review code for vulnerabilities
  ├── SearchAgent: Research latest CVEs
  └── DatabaseAgent: Check stored security logs
All results → MainAgent synthesizes → Final report
```
