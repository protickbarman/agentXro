# Xro Agent Skills

A collection of **Agent Skills** (following the [Agent Skills Specification](https://agentskills.io)) that extend the Xro Agent backend with specialized capabilities and human-like behavior.

## Overview

This directory contains **8 skills** organized by capability domain, plus a **soul.md** that defines the core behavioral framework for all agents.

```
skills/
├── agent-creation/             # Dynamic agent creation, registration, management
├── job-queue-deployment/       # Enhanced queue management, scheduling, deployment
├── llm-prompt-management/      # Prompt versioning, provider management, cost tracking
├── external-integrations/      # Slack, GitHub, Discord, Jira integration
├── agent-memory/               # Persistent memory across sessions and agents
├── agent-communication/        # Agent-to-agent messaging, delegation, collaboration
├── code-execution-visualization/ # Safe code execution, charts, visualizations
└── pause-resume-execution/     # Agent lifecycle control: pause, resume, step-through
```

## Architecture

```
soul.md ← Core behavioral framework (applies to ALL agents)
  │
  ├── Agent Creation Skill     → AgentFactory, AgentRegistry
  ├── Job Queue Skill          → QueueManager, JobScheduler  
  ├── LLM/Prompt Skill         → PromptRegistry, TokenOptimizer, CostTracker
  ├── Integrations Skill       → IntegrationManager (Slack, GitHub, Discord, Jira)
  ├── Agent Memory Skill       → MemoryManager (ephemeral, semantic, episodic, procedural)
  ├── Agent Communication Skill → AgentMessenger, TaskDelegator, CollaborationManager, ConflictResolver
  ├── Code Execution Skill     → SandboxManager, VisualizationEngine
  └── Pause/Resume Skill       → ExecutionManager, StepThroughDebugger
```

## Skill Format

Each skill follows the standard Agent Skills format:

```
skill-name/
├── SKILL.md              # Required: YAML metadata + markdown instructions
├── scripts/              # CLI tools for automation
├── references/           # Documentation, templates, examples
└── assets/               # Templates and static resources
```

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** (Aiven) with `uuid-ossp` and `pgvector` extensions
- **Redis** (required for queue system)
- **NVIDIA NIM API Key** (for LLM access)

## Installation

### 1. Database Migrations

Each skill requires certain database tables. Run the migration:

```sql
-- Check each skill's SKILL.md for the CREATE TABLE statements
-- Core tables needed by skills:

-- Agent Creation
CREATE TABLE IF NOT EXISTS agent_definitions (...);
CREATE TABLE IF NOT EXISTS agent_execution_history (...);

-- Job Queue
CREATE TABLE IF NOT EXISTS scheduled_jobs (...);
CREATE TABLE IF NOT EXISTS deployment_history (...);
CREATE TABLE IF NOT EXISTS queue_metrics (...);

-- LLM/Prompt Management
CREATE TABLE IF NOT EXISTS prompt_templates (...);
CREATE TABLE IF NOT EXISTS prompt_versions (...);
CREATE TABLE IF NOT EXISTS token_usage (...);
CREATE TABLE IF NOT EXISTS llm_providers (...);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (...);
CREATE TABLE IF NOT EXISTS integration_logs (...);
CREATE TABLE IF NOT EXISTS webhook_events (...);

-- Memory
CREATE TABLE IF NOT EXISTS agent_memories (...);
CREATE TABLE IF NOT EXISTS memory_consolidation_log (...);
CREATE TABLE IF NOT EXISTS memory_context_cache (...);

-- Communication
CREATE TABLE IF NOT EXISTS agent_messages (...);
CREATE TABLE IF NOT EXISTS collaboration_workflows (...);
CREATE TABLE IF NOT EXISTS task_delegations (...);

-- Code Execution
CREATE TABLE IF NOT EXISTS code_executions (...);
CREATE TABLE IF NOT EXISTS visualization_assets (...);
CREATE TABLE IF NOT EXISTS execution_cache (...);

-- Pause/Resume
CREATE TABLE IF NOT EXISTS execution_states (...);
CREATE TABLE IF NOT EXISTS execution_commands (...);
CREATE TABLE IF NOT EXISTS execution_step_logs (...);
```

### 2. Environment Variables

```
# Required
NIM_API_KEY=your_nim_key
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NIM_MODEL=nvidia/nemotron-3-super-120b-a12b

# Database
DB_HOST=your-aiven-host
DB_PORT=22082
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://:password@host:port

# Integrations (optional)
SLACK_BOT_TOKEN=xoxb-...
GITHUB_TOKEN=ghp_...
DISCORD_BOT_TOKEN=...
JIRA_API_TOKEN=...
```

## Usage

### Via API

Each skill exposes REST endpoints. After installing:

```bash
# Agent Creation
POST /api/agents          # Create a new agent
GET  /api/agents          # List all agents

# Prompts
POST /api/llm/prompts     # Create prompt template
POST /api/llm/optimize    # Optimize a prompt

# Memory
POST /api/memory          # Store a memory
GET  /api/memory/search   # Search memories

# Integrations
POST /api/integrations    # Register integration

# Communication
POST /api/agents/communicate  # Send agent-to-agent message
POST /api/agents/delegate     # Delegate task to agent

# Code Execution
POST /api/execute         # Execute code in sandbox

# Pause/Resume
POST /api/executions/:id/pause   # Pause execution
POST /api/executions/:id/resume  # Resume execution
```

### Via CLI Scripts

```bash
# Agent creation
node skills/agent-creation/scripts/create-agent.js --name "my-agent" --type "search"

# Deployment
node skills/job-queue-deployment/scripts/deploy-agent.js --name "my-agent"

# Prompt management
node skills/llm-prompt-management/scripts/import-prompts.js --file prompts.json
node skills/llm-prompt-management/scripts/cost-report.js --period daily

# Memory
node skills/agent-memory/scripts/consolidate-memories.js --user-id <userId>

# Code execution
node skills/code-execution-visualization/scripts/run-code.js --code "console.log('hi')"

# Integrations
node skills/external-integrations/scripts/test-integration.js --id <id>
```

### Via Agent Skills Protocol

Each skill can be loaded by any Agent Skills-compatible client:

```xml
<available_skills>
  <skill>
    <name>agent-memory</name>
    <description>Persistent memory system for agents. Use when agents need to remember user preferences, past interactions, or cross-session context.</description>
    <location>/skills/agent-memory/SKILL.md</location>
  </skill>
</available_skills>
```

## Configuration

### Setting Defaults

The `config/env.js` file supports these skill-related settings:

```javascript
// Agent Creation
MAX_AGENTS: 20,

// Memory
MAX_CONTEXT_MEMORIES: 10,
MEMORY_CACHE_TTL: 60000,

// Code Execution
SANDBOX_TIMEOUT: 30000,
SANDBOX_MEMORY_LIMIT: 512,

// Pause/Resume
MAX_PAUSED_PER_USER: 10,
CHECKPOINT_TTL: 3600000, // 1 hour

// Cost Tracking
DAILY_COST_LIMIT: 10,
WEEKLY_COST_LIMIT: 50,
```

## Development

### Adding a New Skill

1. Create a new directory under `skills/`
2. Add `SKILL.md` with proper YAML frontmatter
3. Implement the service under `services/`
4. Add database migration SQL in SKILL.md
5. Add API endpoints in `routes/`
6. Add CLI scripts in `scripts/`
7. Reference existing skills as patterns

### Testing

```bash
# Test all skills
npm test

# Test specific service
node -e "const svc = require('./services/MemoryManager'); svc.store({...}).then(console.log)"
```

## soul.md Alignment

All skills are designed to work with `soul.md`. The soul.md defines:

- **Identity**: What agents are (collaborators, not tools)
- **Cognition**: How agents think (curious, thoughtful, honest)
- **Interaction**: How agents communicate (natural, adaptive, clear)
- **Growth**: How agents learn (memory, reflection, evolution)

When executing any skill, agents should reference `soul.md` for behavioral guidance.

## License

Apache 2.0
