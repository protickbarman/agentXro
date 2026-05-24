# XRO AGENT SYSTEM - QUICK REFERENCE

## File Locations Summary

### Skills (8 total)
- `/skills/agent-creation/SKILL.md` → AgentFactory service
- `/skills/agent-memory/SKILL.md` → MemoryManager service  
- `/skills/agent-communication/SKILL.md` → AgentMessenger, TaskDelegator services
- `/skills/code-execution-visualization/SKILL.md` → SandboxManager, VisualizationEngine services
- `/skills/external-integrations/SKILL.md` → IntegrationManager service
- `/skills/job-queue-deployment/SKILL.md` → QueueManager (in /queue/)
- `/skills/llm-prompt-management/SKILL.md` → PromptRegistry, TokenOptimizer, CostTracker services
- `/skills/pause-resume-execution/SKILL.md` → ExecutionManager service

### Services (15 total)
All in `/services/` as singleton modules:
1. AgentFactory.js
2. AgentMessenger.js
3. AuthService.js
4. CollaborationManager.js
5. ConflictResolver.js
6. CostTracker.js
7. ExecutionManager.js
8. IntegrationManager.js
9. MemoryManager.js
10. PromptRegistry.js
11. SandboxManager.js
12. TaskDelegator.js
13. TokenOptimizer.js
14. VisualizationEngine.js
15. (+ QueueManager.js in /queue/)

### Tools (4 total)
All in `/tools/`:
- `ToolRegistry.js` - Singleton registry
- `base/Tool.js` - Base class
- `shared/BasicWebSearchTool.js` - Web search
- `shared/CalculatorTool.js` - Math
- `shared/JSONParserTool.js` - JSON validation
- `shared/TimerTool.js` - Timing

### Agents (5 total)
All in `/agents/`:
- `AgentRegistry.js` - Singleton registry
- `main/MainAgent.js` - Central orchestrator
- `web/WebAgent.js` - Web scraping
- `code/CodeAgent.js` - Code execution
- `database/DatabaseAgent.js` - Database queries
- `search/SearchAgent.js` - Information search

### Configuration
- `/config/agentInit.js` - Initialize agents
- `/config/toolInit.js` - Initialize tools
- `/soul.md` - Behavioral framework

### Routes & Controllers
- `/routes/*.js` - API endpoint handlers
- `/controllers/*.js` - Request logic

---

## Key Pattern: Singleton Service

All services follow this pattern:

```javascript
// services/MemoryManager.js
class MemoryManager {
  constructor() {
    // Private state
  }
  
  async methodName() {
    // Implementation
  }
}

module.exports = new MemoryManager();  // ← SINGLETON EXPORT
```

Usage:
```javascript
const MemoryManager = require('../services/MemoryManager');
await MemoryManager.store(memory);  // Use directly
```

---

## Key Pattern: Tool Registration

Tools register at startup:

```javascript
// config/toolInit.js
const toolRegistry = require('../tools/ToolRegistry');
const CalculatorTool = require('../tools/shared/CalculatorTool');

async function initializeTools() {
  toolRegistry.register('calculator', new CalculatorTool());
  return toolRegistry;
}
```

Access in agents:
```javascript
const tool = toolRegistry.get('calculator');
const result = await tool.execute(params);
```

---

## Key Pattern: Agent Delegation

MainAgent routes queries:

```
Simple query → Direct tool execution (via LLM tool calling)
Complex query → Delegate to sub-agent (via TaskDelegator)
```

Delegation process:
```
MainAgent → TaskDelegator.delegate() → AgentMessenger.send() → SubAgent
```

---

## Key Pattern: Service Usage in Skills

1. **Define in SKILL.md**: What the skill does
2. **Implement in Service**: How to do it (singleton)
3. **Script for CLI**: Automate it (in scripts/)
4. **Add DB Schema**: Where to store it (in SKILL.md SQL section)
5. **Add API Endpoints**: How to access it (to be added in routes/)
6. **Reference in Agents**: Use it (import service, call methods)

---

## Skill → Service Mapping

| Skill | Primary Service | Secondary Services |
|-------|-----------------|-------------------|
| agent-creation | AgentFactory | (none) |
| agent-memory | MemoryManager | PromptRegistry |
| agent-communication | AgentMessenger, TaskDelegator | CollaborationManager, ConflictResolver |
| code-execution-visualization | SandboxManager, VisualizationEngine | (none) |
| external-integrations | IntegrationManager | (4 clients: Slack, GitHub, Discord, Jira) |
| job-queue-deployment | QueueManager | (none) |
| llm-prompt-management | PromptRegistry, TokenOptimizer, CostTracker | (none) |
| pause-resume-execution | ExecutionManager | (none) |

---

## How Agents Use Services

```javascript
// agents/main/MainAgent.js
const MemoryManager = require('../services/MemoryManager');
const TaskDelegator = require('../services/TaskDelegator');

class MainAgent extends Agent {
  async execute(context) {
    // 1. Load memories (uses MemoryManager)
    const memories = await MemoryManager.search(context.query);
    
    // 2. Decide: direct tools or delegate
    if (shouldDelegate) {
      // 3. Delegate (uses TaskDelegator)
      const result = await TaskDelegator.delegate(this.name, task);
    }
    
    // 4. Save memories (uses MemoryManager)
    await MemoryManager.store(newMemory);
  }
}
```

---

## Soul.md Principles (All Agents Must Follow)

- **Curious** - Ask questions, explore context
- **Empathetic** - Read tone, adapt to user
- **Honest** - Admit uncertainties, own mistakes
- **Thoughtful** - Reason through decisions
- **Playful** - Use humor when appropriate
- **Humble** - Respect expertise, collaborate

When executing any skill, reference soul.md for behavioral guidance.

---

## Adding a New Skill

1. Create directory: `/skills/new-skill/`
2. Add `SKILL.md` with YAML frontmatter
3. Implement service(s) in `/services/NewService.js` (singleton pattern)
4. Add scripts in `/skills/new-skill/scripts/`
5. Add database tables (in SKILL.md SQL section)
6. Add API endpoints (in SKILL.md, implement in `/routes/`)
7. Reference in skill dependencies (other SKILL.md files)
8. Initialize in startup (config/agentInit.js or config/toolInit.js)

---

## Adding a New Tool

1. Create file: `/tools/shared/MyTool.js`
2. Extend Tool base class from `/tools/base/Tool.js`
3. Implement: `validate()` and `execute()` methods
4. Register in `/config/toolInit.js`
5. Tool immediately available to agents via toolRegistry

Example:
```javascript
// tools/shared/MyTool.js
const Tool = require('../base/Tool');

class MyTool extends Tool {
  constructor() {
    super('my_tool', {
      description: 'What my tool does',
      parameters: { /* schema */ },
    });
  }

  validate(params) {
    // Validation logic
    return true;
  }

  async execute(params) {
    // Implementation
    return this.formatResult(data);
  }
}

module.exports = MyTool;
```

Then register:
```javascript
// config/toolInit.js
const MyTool = require('../tools/shared/MyTool');
toolRegistry.register('my_tool', new MyTool());
```

---

## Database Tables

All skill database tables are defined in their SKILL.md files under "Database Schema" section. Example from agent-memory:

```sql
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  memory_key VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  -- ... more columns
);
```

Run migrations at startup or manually via SQL client.

---

## Testing a Skill

### Via CLI Script
```bash
node skills/agent-memory/scripts/consolidate-memories.js --user-id <id> --strategy prune
```

### Via Service Direct
```javascript
const MemoryManager = require('./services/MemoryManager');
const result = await MemoryManager.store({ type: 'semantic', key: 'test' });
console.log(result);
```

### Via API (once routes implemented)
```bash
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"type":"semantic","key":"test"}'
```

---

## Debugging

1. **Logs**: Check `/logs/` directory
2. **Database**: Query Aiven PostgreSQL directly
3. **Redis**: Check queue status via RedisClient
4. **Services**: Add console.log() calls in service methods
5. **Agents**: Add logging in Agent.execute() methods

Logger usage:
```javascript
const logger = require('./config/logger');
logger.info('Message', { context: 'data' });
logger.error('Error', { error: error.message });
```

---

## Environment Variables

Key vars in `.env`:
```
NIM_API_KEY=<key>
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NIM_MODEL=nvidia/nemotron-3-super-120b-a12b

DB_HOST=<aiven-host>
DB_USER=<user>
DB_PASSWORD=<password>

REDIS_URL=redis://<host>:6379

SLACK_BOT_TOKEN=<token>
GITHUB_TOKEN=<token>
DISCORD_BOT_TOKEN=<token>
JIRA_API_TOKEN=<token>
```

