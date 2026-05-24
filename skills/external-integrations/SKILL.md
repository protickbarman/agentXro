---
name: external-integrations
description: Integration with external services including Slack, GitHub, Discord, and Jira. Use when connecting agents to external platforms, syncing data, sending notifications, or automating cross-platform workflows.
compatibility:
  requires:
    - WebSocket support (index.js)
    - WebAgent (agents/web/)
    - LLMManager (for AI-powered integration tasks)
  dependencies:
    - Job Queue skill (for async integration tasks)
---

# External Integrations Skill

This skill provides a complete framework for connecting Xro Agent to external services: Slack, GitHub, Discord, and Jira.

## Architecture Overview

```
External Integrations
├── IntegrationManager      → Central integration orchestration
├── SlackIntegration        → Slack API client
├── GitHubIntegration       → GitHub API client
├── DiscordIntegration      → Discord API client
├── JiraIntegration         → Jira API client
├── WebhookManager          → Incoming webhook handling
└── IntegrationAPI          → REST + WebSocket endpoints
```

## Integration Configuration

Each integration follows this configuration pattern:

```javascript
{
  type: 'slack' | 'github' | 'discord' | 'jira',
  name: string,                    // Integration instance name
  enabled: boolean,
  config: {
    // Provider-specific config
  },
  permissions: {
    read: boolean,
    write: boolean,
    notify: boolean,
  },
  triggers: [                      // Auto-trigger conditions
    { event: string, action: string }
  ],
  createdBy: UUID,
}
```

## Supported Integrations

### Slack Integration
```javascript
{
  type: 'slack',
  config: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    channels: ['general', 'dev-team'],
  },
  capabilities: [
    'send_message',         // Send messages to channels/users
    'read_messages',        // Read channel messages
    'create_thread',        // Create threaded conversations
    'upload_file',          // Upload files to channels
    'search_messages',      // Search Slack history
    'add_reaction',         // Add emoji reactions
  ],
}
```

#### Slack Events Handled
- `message` — Incoming messages (agent can respond)
- `app_mention` — Bot mentioned (agent can respond)
- `reaction_added` — Reactions to agent messages

### GitHub Integration
```javascript
{
  type: 'github',
  config: {
    token: process.env.GITHUB_TOKEN,
    owner: 'your-org',
    repos: ['repo1', 'repo2'],
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },
  capabilities: [
    'create_issue',         // Create issues
    'create_pr',             // Create pull requests
    'review_pr',             // Review PRs
    'comment_on_issue',      // Comment on issues/PRs
    'list_issues',           // List/filter issues
    'get_repo_contents',     // Read repository files
    'create_comment',        // Create review comments
    'list_commits',          // View commit history
  ],
}
```

#### GitHub Webhooks Handled
- `issues.opened` — New issue created
- `issues.assigned` — Issue assigned
- `pull_request.opened` — New PR
- `pull_request.review_requested` — Review requested
- `push` — Code pushed to repo

### Discord Integration
```javascript
{
  type: 'discord',
  config: {
    botToken: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    intents: ['GUILD_MESSAGES', 'DIRECT_MESSAGES'],
  },
  capabilities: [
    'send_message',         // Send messages to channels
    'read_messages',        // Read channel messages
    'create_thread',        // Create threads
    'add_reaction',         // React to messages
    'upload_file',          // Share files
    'manage_roles',         // Assign roles (if authorized)
  ],
}
```

### Jira Integration
```javascript
{
  type: 'jira',
  config: {
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    baseUrl: process.env.JIRA_BASE_URL,
    project: 'PROJ',
  },
  capabilities: [
    'create_issue',         // Create Jira tickets
    'update_issue',         // Update ticket status/fields
    'search_issues',        // JQL search
    'add_comment',          // Comment on tickets
    'get_issue',            // Get ticket details
    'list_transitions',     // Get available transitions
    'transition_issue',     // Change ticket status
  ],
}
```

## Integration Manager

### Register an Integration
```javascript
const IntegrationManager = require('./services/IntegrationManager');

await IntegrationManager.register({
  type: 'slack',
  name: 'workspace-slack',
  config: {
    botToken: 'xoxb-...',
    channels: ['general'],
  },
  permissions: { read: true, write: true, notify: true },
});
```

### Execute Integration Actions
```javascript
// Send a notification via Slack
await IntegrationManager.execute('workspace-slack', 'send_message', {
  channel: '#dev-team',
  text: 'New agent execution completed!',
  blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Result: ...' } }],
});

// Create a GitHub issue
await IntegrationManager.execute('github-main', 'create_issue', {
  repo: 'my-repo',
  title: 'Bug found by Xro Agent',
  body: '## Bug Description\n...',
  labels: ['bug', 'automated'],
});

// Search Jira issues
await IntegrationManager.execute('jira-main', 'search_issues', {
  jql: 'project = PROJ AND status = "In Progress"',
  maxResults: 10,
});
```

### Webhook Handling
```javascript
// Register a webhook endpoint
app.post('/webhooks/slack', async (req, res) => {
  await IntegrationManager.handleWebhook('slack', req.body);
  res.status(200).send('OK');
});

app.post('/webhooks/github', async (req, res) => {
  await IntegrationManager.handleWebhook('github', req.body);
  res.status(200).send('OK');
});
```

## Agent-Triggered Integrations

Agents can trigger integrations automatically:

```javascript
// In any agent's execute method
const context = {
  integrations: {
    notifyOnComplete: 'slack',
    notifyChannel: '#agent-results',
  },
};
```

### Auto-Trigger Configuration
```javascript
const trigger = {
  integrationName: 'workspace-slack',
  condition: {
    type: 'agent_completion',
    agentName: 'research-agent',
    status: 'success',
  },
  action: 'send_message',
  params: {
    channel: '#research-results',
    text: 'Research completed: {result.summary}',
  },
};
```

## Database Schema

```sql
-- Integration configurations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  permissions JSONB DEFAULT '{"read": false, "write": false, "notify": false}',
  triggers JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, name)
);

-- Integration execution log
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  params JSONB DEFAULT '{}',
  result JSONB,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook events received
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/integrations
Register a new integration.

### GET /api/integrations
List all registered integrations.

### GET /api/integrations/:id
Get integration details.

### PUT /api/integrations/:id
Update integration configuration.

### DELETE /api/integrations/:id
Remove an integration.

### POST /api/integrations/:id/execute
Execute an integration action.

### POST /api/integrations/:id/test
Test integration connectivity.

### POST /api/integrations/:id/triggers
Create an auto-trigger rule.

### GET /api/integrations/logs
Get integration execution logs.

## WebSocket Events

- `integration:registered` — New integration added
- `integration:status` — Integration health update
- `integration:executed` — Action executed via integration
- `integration:error` — Integration error
- `webhook:received` — Webhook event received
- `webhook:processed` — Webhook event processed

## Environment Variables

```
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...

# Jira
JIRA_EMAIL=user@example.com
JIRA_API_TOKEN=...
JIRA_BASE_URL=https://your-domain.atlassian.net
```

## Guidelines

1. **Start with Slack and GitHub** — These provide the most value for most use cases.
2. **Secure credentials** — Store all API tokens in environment variables, never in code.
3. **Rate limiting** — Respect each service's rate limits; implement exponential backoff.
4. **Webhook verification** — Always verify webhook signatures for security.
5. **Test integration** — After registering, always run a health check.
6. **Log all actions** — Every integration action should be logged for audit trail.
7. **Graceful degradation** — If an integration fails, log the error and continue without blocking the user.
8. **Notifications are opt-in** — Only send notifications to channels/users that have opted in.

## References

- See `references/slack-api.md` for Slack API patterns
- See `references/github-api.md` for GitHub API patterns
- See `references/discord-api.md` for Discord API patterns
- See `references/jira-api.md` for Jira API patterns
- See `scripts/test-integration.js` for connectivity testing

## Examples

**Example 1: Agent reports results to Slack**
```
When research-agent completes a task, send a formatted report to #research-results:
{
  integration: 'workspace-slack',
  action: 'send_message',
  params: {
    channel: '#research-results',
    text: 'Research complete for: {query}',
    blocks: [ ... formatted blocks ... ]
  }
}
```

**Example 2: Auto-create GitHub issue from agent finding**
```
When web-agent finds a bug during testing:
{
  integration: 'github-main',
  action: 'create_issue',
  params: {
    repo: 'my-repo',
    title: '[Auto] Bug found by Xro Agent',
    body: '...',
    labels: ['bug', 'automated']
  }
}
```
