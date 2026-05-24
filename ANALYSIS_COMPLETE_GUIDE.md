# XRO AGENT SYSTEM - COMPLETE ANALYSIS GUIDE

**Date**: May 22, 2026  
**Status**: Comprehensive System Analysis Complete  
**Files Generated**: 3 detailed documents

---

## Documents Generated

### 1. SYSTEM_ARCHITECTURE_ANALYSIS.md (36 KB)
**The definitive technical reference**

Comprehensive 12-section deep-dive covering:
- Existing tools architecture (4 tools + registry)
- All 8 agent skills with directory structures
- Subagent architecture and delegation flow
- Service layer (15 core services, all singletons)
- Integration points between skills and services
- Tool usage patterns and registry
- Complete directory tree
- Full skill example (Agent Memory Skill)
- Skill discovery mechanisms
- Subagent instruction flow
- Complete services list
- Architecture summary

**Use for**: Understanding the complete system design, implementation patterns, and how everything fits together.

---

### 2. ARCHITECTURE_QUICK_REFERENCE.md (8.2 KB)
**Quick lookup guide**

Fast-reference covering:
- File locations for all components (skills, services, tools, agents)
- Key patterns (singleton services, tool registration, agent delegation, service usage)
- Skill-to-service mapping table
- How agents use services
- Soul.md principles
- Step-by-step guides for adding new:
  - Skills
  - Tools
  - Agents
- Database tables reference
- Testing methods (CLI, service direct, API)
- Debugging tips
- Environment variables

**Use for**: Quick lookups during development, adding new components, testing, and debugging.

---

### 3. ARCHITECTURE_VISUAL_SUMMARY.txt (14 KB)
**Visual ASCII architecture diagrams**

Layered visual summary including:
- Layer 1: Behavioral Framework (soul.md)
- Layer 2: Skills (8 skills with directory structure)
- Layer 3: Services (15 singletons organized by category)
- Layer 4: Agent Orchestration (5 agents with routing diagram)
- Layer 5: Tools (4 tools + registry)
- Full request flow (detailed sequence)
- Database schema overview
- Key patterns reference
- Adding new capabilities checklists
- Quick command reference

**Use for**: Understanding system architecture at a glance, explaining to others, and reference during design discussions.

---

## System Summary

### Architecture Stack

```
┌─────────────────────────────────────────┐
│ soul.md (Behavioral Framework)          │
├─────────────────────────────────────────┤
│ 8 Agent Skills (SKILL.md + services)    │
├─────────────────────────────────────────┤
│ 15 Core Singleton Services              │
├─────────────────────────────────────────┤
│ 5 Agents (MainAgent + 4 sub-agents)    │
├─────────────────────────────────────────┤
│ 4 Tools + ToolRegistry                  │
├─────────────────────────────────────────┤
│ PostgreSQL Database (Aiven)             │
│ Redis Queue (Bull)                      │
└─────────────────────────────────────────┘
```

### 8 Agent Skills

| # | Skill | Service | Scripts |
|---|-------|---------|---------|
| 1 | agent-creation | AgentFactory | create-agent.js |
| 2 | agent-memory | MemoryManager | consolidate-memories.js |
| 3 | agent-communication | AgentMessenger, TaskDelegator | (none) |
| 4 | code-execution-visualization | SandboxManager, VisualizationEngine | run-code.js |
| 5 | external-integrations | IntegrationManager + 4 clients | test-integration.js |
| 6 | job-queue-deployment | QueueManager | deploy-agent.js |
| 7 | llm-prompt-management | PromptRegistry, TokenOptimizer, CostTracker | import-prompts.js, cost-report.js |
| 8 | pause-resume-execution | ExecutionManager | recover-executions.js |

### 15 Core Services

All are singletons (instantiated once, exported as single instance):

**Agent Management**:
- AgentFactory
- AgentRegistry

**Communication & Delegation**:
- AgentMessenger
- TaskDelegator
- CollaborationManager
- ConflictResolver

**Memory & Persistence**:
- MemoryManager
- PromptRegistry
- ExecutionManager

**Code & Visualization**:
- SandboxManager
- VisualizationEngine

**Optimization & Tracking**:
- TokenOptimizer
- CostTracker

**Integrations**:
- IntegrationManager (with 4 clients: Discord, GitHub, Jira, Slack)

**Core**:
- AuthService
- QueueManager

### 5 Agents

- **MainAgent**: Central orchestrator, routes queries to sub-agents or direct tools
- **WebAgent**: Web scraping and data extraction
- **CodeAgent**: Code execution and debugging
- **DatabaseAgent**: SQL queries and data analysis
- **SearchAgent**: Information retrieval and research

### 4 Tools

- **CalculatorTool**: Mathematical calculations
- **BasicWebSearchTool**: Web search via DuckDuckGo
- **JSONParserTool**: JSON validation and formatting
- **TimerTool**: Timing operations

---

## Key Insights

### 1. Singleton Pattern Throughout
Every service is instantiated once and exported as a singleton:
```javascript
// services/MemoryManager.js
module.exports = new MemoryManager();
```

### 2. Skill → Service → Database Flow
Each skill defines requirements, a service implements them, database stores data:
- SKILL.md: "What this skill does"
- Service: "How to do it"
- Database: "Where to store it"

### 3. Tool Registry Pattern
Tools are registered at startup, accessed by agents via registry:
```javascript
toolRegistry.register('calculator', new CalculatorTool());
const tool = toolRegistry.get('calculator');
```

### 4. Agent Delegation Pattern
MainAgent analyzes query and either:
- Uses direct tools (simple queries)
- Delegates to sub-agents (complex queries)

Delegation uses TaskDelegator + AgentMessenger for structured inter-agent communication.

### 5. Soul.md as Behavioral Framework
All agents must follow soul.md principles:
- Curious, Empathetic, Honest, Thoughtful, Playful, Humble

### 6. Service Dependencies
Services can depend on other services:
- MemoryManager depends on PromptRegistry
- MainAgent uses MemoryManager + TaskDelegator
- Services reference each other for cross-skill functionality

---

## For Adding New Capabilities

### New Skill (8-step process)
1. Create `/skills/new-skill/SKILL.md` with YAML frontmatter
2. Implement service(s) in `/services/NewService.js` (singleton pattern)
3. Add CLI scripts in `/skills/new-skill/scripts/`
4. Define database tables in SKILL.md
5. Plan API endpoints in SKILL.md
6. Reference dependencies in SKILL.md
7. Register in `/config/agentInit.js` or `/config/toolInit.js`
8. Implement routes when API endpoints are needed

### New Tool (4-step process)
1. Create `/tools/shared/MyTool.js` extending Tool base class
2. Implement `validate()` and `execute()` methods
3. Register in `/config/toolInit.js`
4. Tool automatically available to all agents

### New Agent (3-step process)
1. Create `/agents/my-type/MyAgent.js` extending Agent base class
2. Implement `execute()` method
3. Register in `/config/agentInit.js`
4. MainAgent can delegate tasks to it

---

## Quick Command Reference

### Test Skill via CLI
```bash
node skills/agent-memory/scripts/consolidate-memories.js --user-id <id>
```

### Test Service Direct
```bash
node -e "const M = require('./services/MemoryManager'); M.store({...})"
```

### Test Tool via API
```bash
curl -X POST http://localhost:3000/api/tools/calculator/execute \
  -H "Content-Type: application/json" \
  -d '{"params":{"expression":"2+2"}}'
```

### API Endpoints (Current)
- `GET /api/agents` - List all agents
- `GET /api/tools` - List all tools
- `GET /api/agents/:agentName` - Get agent capabilities
- `POST /api/tools/:toolName/execute` - Execute a tool
- `POST /new` - Send message to MainAgent

---

## Files Location Quick Map

```
/skills/                          ← 8 skills (each with SKILL.md + scripts/)
/services/                        ← 15 singleton services
/tools/                          ← 4 tools + ToolRegistry
/agents/                         ← 5 agents (MainAgent + 4 sub-agents)
/routes/                         ← API endpoint handlers
/controllers/                    ← Request logic
/config/                         ← Initialization & configuration
  ├── agentInit.js             ← Initialize agents at startup
  ├── toolInit.js              ← Initialize tools at startup
  └── ...
/index.js                       ← Main Express app
/soul.md                        ← Behavioral framework for all agents
```

---

## Next Steps for Development

### To Add New Skill:
Use "ARCHITECTURE_QUICK_REFERENCE.md" section "Adding a New Skill"

### To Add New Tool:
Use "ARCHITECTURE_QUICK_REFERENCE.md" section "Adding a New Tool"

### To Understand Integration:
Read "SYSTEM_ARCHITECTURE_ANALYSIS.md" sections 4-5 (Services & Integration Points)

### To Understand Agent Flow:
Read "ARCHITECTURE_VISUAL_SUMMARY.txt" section "FULL REQUEST FLOW"

### To Understand Patterns:
Read "SYSTEM_ARCHITECTURE_ANALYSIS.md" section 6 (Tool Usage Patterns)

---

## References

- **soul.md** - Behavioral framework for all agents
- **skills/README.md** - Overview of all skills
- **SKILL.md files** - Individual skill specifications
- **config/agentInit.js** - Agent initialization
- **config/toolInit.js** - Tool initialization

---

## Document Navigation

```
START HERE → ARCHITECTURE_VISUAL_SUMMARY.txt (Overview)
            ↓
            ARCHITECTURE_QUICK_REFERENCE.md (Details)
            ↓
            SYSTEM_ARCHITECTURE_ANALYSIS.md (Deep-Dive)
```

---

## Questions & Answers

**Q: Where do I add a new skill?**
A: Create `/skills/my-skill/SKILL.md` following the format in existing skills.

**Q: How do services work?**
A: All are singletons (instantiated once). Import and use directly:
```javascript
const MemoryManager = require('./services/MemoryManager');
await MemoryManager.store(data);
```

**Q: How do agents communicate?**
A: Via AgentMessenger and TaskDelegator services. MainAgent delegates complex queries to sub-agents.

**Q: What's the role of soul.md?**
A: Defines behavioral principles all agents must follow (Curious, Empathetic, Honest, etc.).

**Q: Can agents use other agents' services?**
A: Yes! Services are shared. Any agent can require and use any service.

**Q: How are tools accessed?**
A: Via ToolRegistry singleton. Agents call `toolRegistry.get('tool_name').execute(params)`.

**Q: What's the database architecture?**
A: PostgreSQL (Aiven) with tables for each skill. See SKILL.md files for schema.

---

## Performance Considerations

- Services are singletons to minimize memory
- Tool registry is cached at startup
- Agent registry is cached at startup
- MemoryManager caches frequently accessed memories
- PromptRegistry caches templates (5 min TTL)
- ExecutionManager tracks state in memory

---

## Security Considerations

- All tools execute with timeout and retry protection
- Code execution sandbox (SandboxManager) blocks dangerous modules
- Authentication middleware on sensitive routes
- Task delegation validates target agent exists
- Memory is scoped (user, conversation, global)

---

Generated: May 22, 2026
System Version: Xro Agent 1.0.0
Total Components: 8 Skills + 15 Services + 5 Agents + 4 Tools
