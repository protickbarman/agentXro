---
name: pause-resume-execution
description: Control agent execution lifecycle with pause, resume, cancel, and step-through debugging. Use when users need to interrupt running agents, inspect intermediate state, step through execution, or resume paused tasks.
compatibility:
  requires:
    - WebSocket streaming (index.js)
    - Agent base class (agents/base/Agent.js)
    - Bull Queue (queue/)
  dependencies:
    - Agent Communication skill (for state broadcasting)
    - Job Queue skill (for paused job persistence)
---

# Pause/Resume Agent Execution Skill

This skill provides execution lifecycle control for agents — pause running tasks, inspect intermediate state, step through execution, resume later, or cancel entirely.

## Architecture Overview

```
Pause/Resume System
├── ExecutionManager         → Central execution lifecycle control
├── ExecutionState           → State persistence and transitions
├── ExecutionCheckpointer    → Save/restore execution progress
├── StepThroughDebugger      → Step-by-step execution mode
├── ExecutionQueue           → Paused/resumed job management
└── ExecutionAPI             → REST + WebSocket endpoints
```

## Execution States

```
                  ┌─────────────┐
                  │   PENDING   │
                  └──────┬──────┘
                         │ start
                         ▼
                  ┌─────────────┐
        ┌─────────│ PROCESSING  │─────────┐
        │         └──────┬──────┘         │
        │ pause          │ step           │ complete
        ▼                ▼                ▼
 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 │   PAUSED    │  │  STEPPING   │  │  COMPLETED  │
 └──────┬──────┘  └──────┬──────┘  └─────────────┘
        │ resume         │ next
        ▼                ▼
 ┌─────────────┐  ┌─────────────┐
 │ PROCESSING  │  │  STEPPING   │
 └─────────────┘  └─────────────┘
                        │ complete
                        ▼
                  ┌─────────────┐
                  │  COMPLETED  │
                  └─────────────┘

 ┌─────────────┐
 │  CANCELLED  │ ← Available from any state
 └─────────────┘

 ┌─────────────┐
 │   FAILED    │ ← On error
 └─────────────┘
```

## Execution Control

### Pause Execution
```javascript
const ExecutionManager = require('./services/ExecutionManager');

// Pause a running execution
await ExecutionManager.pause(executionId);

// Pause by conversation
await ExecutionManager.pauseByConversation(conversationId);

// Pause all agent executions
await ExecutionManager.pauseAll({ agentName: 'search-agent' });
```

### Resume Execution
```javascript
// Resume a paused execution
await ExecutionManager.resume(executionId);

// Resume with modified context
await ExecutionManager.resume(executionId, {
  modifiedQuery: 'Refined search query...',
  additionalContext: { ... },
});

// Resume all paused for user
await ExecutionManager.resumeByUser(userId);
```

### Cancel Execution
```javascript
// Cancel execution
await ExecutionManager.cancel(executionId);

// Cancel with cleanup
await ExecutionManager.cancel(executionId, { cleanupResources: true });
```

## Execution Checkpointing

When an execution is paused, its state is checkpointed:

```javascript
{
  executionId: UUID,
  agentName: string,
  status: 'paused',
  checkpoint: {
    step: number,                    // Current execution step
    totalSteps: number,
    completedSteps: [                // Completed step results
      { step: 1, agent: 'web-agent', result: {...} },
      { step: 2, agent: 'search-agent', result: {...} },
    ],
    currentContext: {                // Partial execution context
      conversationId: UUID,
      userId: UUID,
      query: string,
      intermediateResults: {...},
    },
    llmState: {                      // LLM interaction state
      tokensUsed: number,
      lastPrompt: string,
      lastResponse: string,
    },
    resourcesAllocated: [            // Resources in use
      { type: 'tool', name: 'web_search', status: 'in_use' },
    ],
  },
  timeline: {                        // Execution history
    startedAt: Date,
    lastPausedAt: Date,
    totalActiveTime: number,         // ms
    pauseCount: number,
  },
  expiresAt: Date,                   // Checkpoint TTL
}
```

## Step-Through Debugging

Step-through mode allows users to execute agent tasks one step at a time:

### Enable Step Mode
```javascript
const execution = await ExecutionManager.start({
  agentName: 'research-agent',
  query: 'Analyze competitor websites',
  mode: 'step-through',               // step-through | automatic
});
```

### Step Commands
```javascript
// Move to next step
await StepThroughDebugger.next(executionId);

// Get current step info
const currentStep = await StepThroughDebugger.getCurrentStep(executionId);
// { step: 3, description: 'Searching competitor data...', state: 'ready' }

// Skip to a specific step
await StepThroughDebugger.skipTo(executionId, 5);

// Repeat the current step
await StepThroughDebugger.repeatStep(executionId);

// Get step history
const history = await StepThroughDebugger.getStepHistory(executionId);
```

### Step Events
```javascript
// WebSocket events for step-through mode
socket.on('execution:step:ready', (data) => {
  // Current step is ready to execute
  console.log(`Step ${data.step}: ${data.description}`);
  console.log('Expected action:', data.expectedAction);
});

socket.on('execution:step:executing', (data) => {
  // Step is being executed
  console.log(`Executing step ${data.step}...`);
});

socket.on('execution:step:completed', (data) => {
  // Step completed with result
  console.log(`Step ${data.step} completed:`, data.result);
});

socket.on('execution:step:paused', (data) => {
  // Between steps, waiting for user input
  console.log('Step complete. Type "next" to continue or "modify" to adjust.');
});
```

## User Interaction During Execution

### Step-Through UI Pattern
```
Agent: "I'm analyzing your request in steps:"
Agent: "Step 1: Understanding the query... [DONE]"
Agent: "Step 2: Searching for information..."
       ┌─────────────────────────────────────┐
       │  [▶ Continue] [⏸ Pause] [✕ Cancel]  │
       │  [🔍 Show Details]                    │
       └─────────────────────────────────────┘
User: "Wait, search specifically for 2026 data"
Agent: "Step 2 modified. Searching with date filter..."
Agent: "Step 2: [DONE] - Found 15 results"
Agent: "Step 3: Analyzing results..." [AUTO]
User: "Pause here, let me review"
Agent: "Paused after step 2. Current data: [preview]"
User: "OK, continue"
Agent: "Resuming step 3..."
```

### Modify Execution Mid-Flight
```javascript
// User can modify the execution while paused
await ExecutionManager.modify(executionId, {
  modifiedQuery: 'Search for 2026 data only',
  additionalInstructions: 'Focus on security features',
  skipSteps: [4],                    // Skip certain steps
  injectData: {                      // Inject data at current step
    step3_input: { source: 'internal_db', filters: { year: 2026 } },
  },
});
```

## Execution Queue Integration

Paused executions are persisted to the queue for recovery:

```javascript
// When execution is paused
await QueueManager.addJob('execution', 'pause_execution', {
  executionId,
  checkpoint: { ... },
  expiresAt: Date.now() + 3600000,   // 1 hour TTL
});

// Recovery after restart
await ExecutionManager.recoverPausedExecutions();

// Cleanup expired checkpoints
await ExecutionManager.cleanupExpired({ olderThan: '24h' });
```

## Database Schema

```sql
-- Execution state
CREATE TABLE IF NOT EXISTS execution_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID UNIQUE NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  mode VARCHAR(50) DEFAULT 'automatic',
  checkpoint JSONB,
  timeline JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution control commands
CREATE TABLE IF NOT EXISTS execution_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  params JSONB DEFAULT '{}',
  issued_by UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Execution logs for step-through
CREATE TABLE IF NOT EXISTS execution_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  step_number INTEGER NOT NULL,
  step_description TEXT,
  status VARCHAR(50) NOT NULL,
  input JSONB,
  output JSONB,
  user_interaction JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/executions/:id/pause
Pause a running execution.

### POST /api/executions/:id/resume
Resume a paused execution.

### POST /api/executions/:id/cancel
Cancel an execution.

### POST /api/executions/:id/step
Proceed to the next step (step-through mode).

### GET /api/executions/:id/step/current
Get current step information.

### GET /api/executions/:id/state
Get execution state and checkpoint.

### POST /api/executions/:id/modify
Modify execution while paused.

### GET /api/executions/paused
List all paused executions.

### GET /api/executions/active
List all active executions.

## WebSocket Events

- `execution:started` — Execution began
- `execution:paused` — Execution paused with checkpoint
- `execution:resumed` — Execution resumed
- `execution:cancelled` — Execution cancelled
- `execution:completed` — Execution completed
- `execution:step:ready` — Step ready (step-through mode)
- `execution:step:executing` — Step being executed
- `execution:step:completed` — Step completed
- `execution:error` — Execution error
- `execution:state_changed` — Any state transition

## Guidelines

1. **Checkpoint frequently** — Save state after every significant step to minimize loss on pause.
2. **Set TTL on paused executions** — Default: 1 hour. Notify user before expiry.
3. **Handle edge cases** — What if a user pauses and logs out? What if the server restarts?
4. **Recover on startup** — On server restart, recover all paused executions from the database.
5. **Resource cleanup** — When cancelling, release all allocated resources (tools, connections).
6. **Notify on timeout** — If a paused execution is about to expire, notify the user.
7. **Limit concurrent pauses** — Max 10 paused executions per user to prevent resource exhaustion.

## References

- See `references/execution-lifecycle.md` for state machine details
- See `references/step-through-guide.md` for step-through usage guide
- See `scripts/recover-executions.js` for recovery automation

## Examples

**Example 1: User pauses a long research task**
```
User: "Research competitor pricing strategies"
Agent: Starts execution...

--- 2 minutes later ---
User: "Pause"

Execution pauses. Checkpoint saved.
Agent: "Research paused at 45%. Current findings:
        - Competitor A: $99/month
        - Competitor B: $149/month
        - Still analyzing C and D"

User: "Wait, also check Competitor E"
Agent modifies query via modify API...

User: "Resume"
Agent continues from checkpoint with modified query.
→ Final report includes all 4 + new competitor
```

**Example 2: Step-through debugging**
```
User: "Debug this SQL query" (in step-through mode)

Step 1: Parse SQL → "SHOW STEP: Here's the parsed query tree. OK?"
User: "Continue"
Step 2: Analyze → "SHOW STEP: Found potential optimization. OK?"
User: "Explain this step"
Agent: [Shows detailed analysis]
User: "Continue"
Step 3: Fix → Query fixed with optimization
Step 4: Test → "SHOW STEP: Run test query? Results: ..."
User: "Looks good, finish"
→ Complete: Fixed and tested SQL query
```
