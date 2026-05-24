---
name: agent-memory
description: Persistent memory system for agents. Store, retrieve, and manage agent memories across conversations. Use when agents need to remember user preferences, past interactions, learned patterns, or context from previous sessions.
compatibility:
  requires:
    - PostgreSQL (existing Aiven DB)
    - Conversation model (models/Conversation.js)
    - Message model (models/Message.js)
  dependencies:
    - LLM & Prompt Management skill (for memory retrieval prompts)
---

# Agent Memory System Skill

This skill provides a persistent memory system that allows agents to remember user preferences, past interactions, learned patterns, and context across sessions.

## Architecture Overview

```
Agent Memory System
├── MemoryManager            → Central memory orchestration
├── ShortTermMemory          → Current conversation context
├── LongTermMemory           → Persistent cross-session storage
├── MemoryRetriever          → Semantic memory search
├── MemoryConsolidator       → Summarize and compress memories
└── MemoryAPI                → REST + WebSocket endpoints
```

## Memory Types

| Type | Scope | Persistence | Capacity | Description |
|------|-------|-------------|----------|-------------|
| **Ephemeral** | Current conversation | Session only | High | Recent messages, current context |
| **Working** | Current task | Until task completes | Medium | Task-specific context, intermediate results |
| **Semantic** | Cross-session | Permanent | High | User preferences, learned patterns, facts |
| **Episodic** | Historical sessions | Permanent | Medium | Past interactions, decisions, outcomes |
| **Procedural** | Permanent | Permanent | Low | How to do things, workflows, recipes |

## Memory Schema

```javascript
{
  id: UUID,
  type: 'semantic' | 'episodic' | 'procedural',
  scope: 'user' | 'conversation' | 'global',
  key: string,                       // Unique memory key
  content: {
    text: string,                    // Memory content
    summary: string,                 // Optional summary for quick retrieval
    metadata: {                      // Structured data
      category: string,
      confidence: number,            // 0.0 - 1.0
      source: string,
      tags: string[],
    }
  },
  context: {
    userId: UUID,
    conversationId: UUID,
    agentName: string,
    timestamp: Date,
    importance: number,              // 1-10, used for consolidation
  },
  embedding: number[],               // Vector embedding for semantic search
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date,                   // TTL for ephemeral memories
}
```

## Memory Operations

### Store Memory
```javascript
const MemoryManager = require('./services/MemoryManager');

// Store a user preference
await MemoryManager.store({
  type: 'semantic',
  scope: 'user',
  key: 'preference:response_style',
  content: {
    text: 'User prefers concise, bullet-point responses with code examples',
    metadata: { category: 'preference', confidence: 0.9, source: 'conversation' },
  },
  context: { userId: 'user-123', importance: 7 },
});

// Store a procedural memory (how to do something)
await MemoryManager.store({
  type: 'procedural',
  scope: 'global',
  key: 'workflow:data_analysis',
  content: {
    text: 'When analyzing data, always: 1) Check data quality 2) Handle missing values 3) Run descriptive stats 4) Visualize distributions',
    metadata: { category: 'workflow', confidence: 1.0, source: 'system' },
  },
  context: { importance: 9 },
});
```

### Retrieve Memories
```javascript
// Get specific memory by key
const memory = await MemoryManager.get('preference:response_style');

// Search memories semantically
const results = await MemoryManager.search('user likes concise responses', {
  scope: 'user',
  userId: 'user-123',
  limit: 5,
  minConfidence: 0.5,
});

// Get all memories for a user
const userMemories = await MemoryManager.getByUser('user-123', {
  types: ['semantic', 'procedural'],
  categories: ['preference', 'workflow'],
});

// Get conversation context
const context = await MemoryManager.getContext('conversation-456');
```

### Update & Delete
```javascript
// Update existing memory
await MemoryManager.update(memoryId, {
  content: { text: 'Updated preference...', confidence: 0.95 },
});

// Delete memory
await MemoryManager.delete(memoryId);

// Clear user memories
await MemoryManager.clearByUser('user-123', { types: ['ephemeral'] });
```

## Memory Consolidation

Periodically, memories are consolidated to:
1. Remove duplicate memories
2. Merge related memories
3. Summarize episodic memories
4. Reduce stale/low-importance memories

```javascript
// Run consolidation
await MemoryManager.consolidate({
  userId: 'user-123',
  strategy: 'merge-related',     // merge-related | summarize | prune
  importance: { min: 3 },         // Only process memories with importance >= 3
});
```

### Consolidation Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| `merge-related` | Combine similar memories | Multiple low-importance memories on same topic |
| `summarize` | Create concise summaries | Long episodic memories |
| `prune` | Remove low-importance old memories | Memory count exceeds limit |
| `refresh` | Update confidence scores | Re-encountered patterns |

## Memory-Augmented Agent Execution

When an agent executes, it can automatically load relevant memories:

```javascript
// In agent execute method
async execute(context) {
  // Load relevant memories
  const memories = await MemoryManager.getContext(context.userId, {
    agentName: this.name,
    query: context.query,
    limit: 5,
  });

  // Inject memories into prompt
  const memoryContext = memories.map(m =>
    `[Memory: ${m.key}] ${m.content.text}`
  ).join('\n');

  // Use with LLM
  const response = await this.llmProvider.generate({
    systemPrompt: `Previous context:\n${memoryContext}\n\nCurrent query:`,
    userPrompt: context.query,
  });

  // Extract new memories from response
  await this._extractMemories(response, context);
}
```

## Database Schema

```sql
-- Memories table
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

-- Memory index for semantic search
CREATE INDEX IF NOT EXISTS idx_memories_user ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON agent_memories(memory_key);
CREATE INDEX IF NOT EXISTS idx_memories_type ON agent_memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Memory consolidation log
CREATE TABLE IF NOT EXISTS memory_consolidation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy VARCHAR(50) NOT NULL,
  memories_processed INTEGER,
  memories_merged INTEGER,
  memories_pruned INTEGER,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory context cache (for quick session initialization)
CREATE TABLE IF NOT EXISTS memory_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  context_summary TEXT,
  relevant_memories UUID[],
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/memory
Store a new memory.

### GET /api/memory/search
Search memories semantically.

### GET /api/memory/:key
Get a specific memory by key.

### PUT /api/memory/:id
Update a memory.

### DELETE /api/memory/:id
Delete a memory.

### GET /api/memory/user/:userId
Get all memories for a user.

### POST /api/memory/consolidate
Run memory consolidation.

### GET /api/memory/context/:conversationId
Get context for a conversation.

## WebSocket Events

- `memory:stored` — New memory saved
- `memory:updated` — Memory updated
- `memory:deleted` — Memory removed
- `memory:consolidated` — Consolidation completed
- `memory:context_loaded` — Context loaded for agent

## Guidelines

1. **Store on key events** — Save memories when: user states preference, agent learns something new, task completes with a notable result, user corrects the agent.
2. **Set appropriate importance** — User preferences = 7-9, facts = 5-7, transient context = 1-3.
3. **Use semantic search** — Always search by meaning, not just keywords.
4. **Consolidate daily** — Run `consolidate` strategy daily to keep memory store efficient.
5. **Respect privacy** — Never store sensitive information (passwords, tokens) in memories unless explicitly authorized.
6. **Context window** — Load top 5-10 most relevant memories into agent context.
7. **Expire ephemeral** — Set TTL on conversation-specific memories (default: 24h).

## References

- See `references/memory-patterns.md` for common memory use cases
- See `scripts/consolidate-memories.js` for consolidation automation
- See `scripts/export-memories.js` for memory export

## Examples

**Example 1: Remember user preference**
```
User: "I prefer Python code examples"
→ Memory: { type: 'semantic', key: 'preference:language', content: 'User prefers Python', importance: 8 }
→ Next query: "Show me how to parse JSON"
→ Agent responds with Python example ← memory loaded automatically
```

**Example 2: Learn from correction**
```
User: "No, use async/await instead of .then()"
→ Memory: { type: 'semantic', key: 'pattern:async_style', content: 'User prefers async/await over promises', importance: 7 }
→ Future responses use async/await pattern
```
