---
name: job-queue-deployment
description: Enhanced job queue management, deployment workflows, task scheduling, and background processing. Use when managing Bull Queue jobs, deploying agents, scheduling recurring tasks, or monitoring queue performance.
compatibility:
  requires:
    - QueueManager (queue/QueueManager.js)
    - JobProcessor (queue/JobProcessor.js)
    - Redis
  dependencies:
    - Agent Creation skill (for agent deployment)
---

# Job Queue & Deployment Skill

This skill provides a comprehensive framework for managing job queues, deploying agents as background tasks, scheduling recurring jobs, and monitoring queue health. Extends the existing Bull Queue infrastructure.

## Architecture Overview

```
Job Queue System
├── QueueManager          → Existing queue management
├── JobProcessor          → Existing job processing
├── JobScheduler          → Recurring job scheduling (NEW)
├── DeploymentManager     → Agent deployment pipeline (NEW)
├── QueueMonitor          → Queue health & metrics (NEW)
└── QueueDashboardAPI     → REST + WebSocket endpoints (NEW)
```

## Job Types

### System Jobs (Existing)
| Job Type | Description | Queue |
|----------|-------------|-------|
| `save_message` | Save message to database | messages |
| `save_tool_execution` | Save tool execution record | tools |
| `save_agent_execution` | Save agent execution record | agents |
| `update_session` | Update session activity | sessions |
| `cleanup` | Clean expired data | maintenance |

### Enhanced Jobs (NEW)
| Job Type | Description | Queue | Priority |
|----------|-------------|-------|----------|
| `deploy_agent` | Deploy/register a new agent | deployment | High |
| `schedule_task` | Schedule a recurring agent task | scheduler | Medium |
| `agent_batch` | Run an agent on a batch of inputs | batch | Low |
| `report_generation` | Generate periodic reports | reporting | Low |
| `memory_maintenance` | Consolidate/clean agent memory | maintenance | Low |
| `integration_sync` | Sync with external services | integration | Medium |
| `health_check` | Run system health checks | maintenance | Low |

## Deployment Workflow

### Step 1: Create Deployment Definition
```javascript
const deployment = {
  name: 'my-agent-deployment',
  agentName: 'research-agent',
  version: '1.0.0',
  config: {
    concurrency: 2,
    timeout: 30000,
    retries: 3,
  },
  schedule: null, // or cron expression
  environment: 'production',
};
```

### Step 2: Deploy via Queue
```javascript
const QueueManager = require('./queue/QueueManager');
await QueueManager.addJob('deployment', 'deploy_agent', {
  deployment,
  userId: 'user-id',
  timestamp: new Date().toISOString(),
}, {
  priority: 'high',
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});
```

### Step 3: Monitor Deployment
Track deployment status through queue events and WebSocket updates.

## Job Scheduling

### Cron-Based Scheduling
Schedule recurring agent executions:

```javascript
const schedule = {
  name: 'daily-report',
  cron: '0 8 * * *',          // Every day at 8 AM
  agentName: 'analytics-agent',
  task: {
    type: 'report_generation',
    params: { period: 'daily', format: 'pdf' },
  },
  timezone: 'UTC',
  enabled: true,
};
```

### One-Time Scheduling
Schedule a job for future execution:

```javascript
await QueueManager.scheduleJob('scheduler', 'schedule_task', {
  executeAt: new Date('2026-06-01T10:00:00Z'),
  task: { ... },
});
```

## Queue Monitoring

### Metrics Tracked
- **Queue depth** — Number of pending jobs per queue
- **Processing rate** — Jobs processed per minute
- **Failure rate** — Percentage of failed jobs
- **Average latency** — Time from enqueue to processing
- **Stuck jobs** — Jobs in active state longer than threshold

### Health Checks
```javascript
// Check queue health
const health = await QueueManager.getHealth();
// Returns: { status: 'healthy'|'degraded'|'down', queues: {...} }
```

## Database Schema

```sql
-- Scheduled jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(100),
  execute_at TIMESTAMPTZ,
  agent_name VARCHAR(255) NOT NULL,
  task_config JSONB NOT NULL DEFAULT '{}',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment history
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_name VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  config JSONB DEFAULT '{}',
  error_message TEXT,
  deployed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Queue metrics (for monitoring)
CREATE TABLE IF NOT EXISTS queue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/queue/deploy
Deploy a new agent via queue.

### POST /api/queue/schedule
Create a scheduled job.

### GET /api/queue/schedules
List all scheduled jobs.

### PUT /api/queue/schedules/:id
Update a schedule.

### DELETE /api/queue/schedules/:id
Remove a schedule.

### GET /api/queue/health
Get queue health metrics.

### GET /api/queue/metrics
Get detailed queue performance metrics.

### POST /api/queue/jobs/:id/retry
Retry a failed job.

### POST /api/queue/jobs/:id/cancel
Cancel a pending job.

## WebSocket Events

- `queue:job:added` — New job added to queue
- `queue:job:processing` — Job started processing
- `queue:job:completed` — Job completed successfully
- `queue:job:failed` — Job failed with error
- `queue:job:retrying` — Job is being retried
- `queue:deployment:status` — Deployment progress updates
- `queue:schedule:triggered` — Scheduled job triggered

## Guidelines

1. **Use existing queues when possible** — Leverage the existing message/tool/agent queues before creating new ones.
2. **Set appropriate priorities** — User-facing jobs get high priority; background maintenance gets low.
3. **Always set retries** — Every job should have at least 1 retry with exponential backoff.
4. **Monitor queue depth** — Alert if any queue depth exceeds 1000.
5. **Clean completed jobs** — Set TTL on completed jobs to auto-clean (default: 1 hour).
6. **Log everything** — Every job lifecycle event should be logged with timestamps.

## References

- See `references/job-schemas.json` for all supported job schemas
- See `references/deployment-workflows.md` for deployment best practices
- See `scripts/create-schedule.js` for scheduling CLI
- See `scripts/deploy-agent.js` for deployment CLI

## Examples

**Example 1: Deploy an agent on a schedule**
```javascript
await QueueManager.addJob('scheduler', 'deploy_agent', {
  agentName: 'report-agent',
  schedule: '0 9 * * 1-5', // Weekdays at 9 AM
  config: { ... }
}, { priority: 'high' });
```

**Example 2: Batch processing**
```javascript
await QueueManager.addJob('batch', 'agent_batch', {
  agentName: 'research-agent',
  inputs: [ 'query1', 'query2', 'query3' ],
  concurrency: 3,
});
```
