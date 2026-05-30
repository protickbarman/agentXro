# Complete Migration from PostgreSQL to MongoDB

This plan outlines the steps required to completely remove PostgreSQL (`pg`) from the project and transition 100% of the data storage to MongoDB (`mongoose`). 

Currently, PostgreSQL is used for User Authentication, Sessions, and deeply integrated into various Advanced Agent Services (Memory, Tasks, Executions, Integrations).

## User Review Required

> [!WARNING]
> **Massive Refactoring Scope**
> Migrating away from PostgreSQL means we must rewrite **every single raw SQL query** in the codebase. This involves updating 2 core models and 10+ advanced background services that currently rely on `config/database.js`.

> [!IMPORTANT]
> **DatabaseAgent Deprecation/Modification**
> The project currently has a `DatabaseAgent` (`agents/database/DatabaseAgent.js`) which specifically takes user requests and translates them into **PostgreSQL queries** to run against the database. 
> Since we are removing PostgreSQL, this agent will no longer function as designed. LLMs are generally much better at writing SQL than complex MongoDB Aggregation pipelines. 
> **Decision needed:** Do you want me to completely remove the `DatabaseAgent`, or attempt to rewrite it to write MongoDB queries instead?

## Open Questions

1. **Service Schemas:** Many of the advanced services (`MemoryManager`, `IntegrationManager`, `TaskDelegator`) execute SQL inserts into tables that don't explicitly exist in the `migrations/` folder (e.g., `integration_logs`, `memories`, `execution_states`). Should I create formal Mongoose Schemas for all of these, or just use schemaless MongoDB collections (`mongoose.connection.db.collection('...')`) to keep the migration faster and more flexible?
2. **DatabaseAgent:** What should we do with the Database Agent (as highlighted above)?

## Proposed Changes

### Core Infrastructure
Remove all PostgreSQL connection logic and dependencies.

#### [DELETE] `config/database.js`
- Remove the PostgreSQL connection pool.

#### [MODIFY] `config/env.js`
- Remove `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` validation.

#### [MODIFY] `package.json`
- Uninstall the `pg` package.

---

### Core Authentication Models
Convert the strict SQL models into flexible Mongoose models.

#### [MODIFY] `models/User.js`
- Create a Mongoose schema with `email`, `password_hash`, `username`, `is_active`.
- Replace all static SQL methods (`findById`, `findByEmail`, `create`, `update`) with Mongoose equivalents (`Model.findOne`, `Model.create`, `Model.findByIdAndUpdate`).

#### [MODIFY] `models/Session.js`
- Create a Mongoose schema for `user_id`, `refresh_token`, `expires_at`, `is_revoked`.
- Replace SQL methods (`revokeAllByUser`, `deleteExpired`, etc.) with Mongoose equivalents.

---

### Advanced Agent Services
All of these services currently import `query` from `config/database.js` and execute raw SQL. They must be rewritten to use MongoDB.

#### [MODIFY] `services/ExecutionManager.js`
- Replace `execution_states` SQL queries with MongoDB state storage.

#### [MODIFY] `services/IntegrationManager.js`
- Replace `integrations`, `webhook_events`, `integration_logs` SQL queries with MongoDB operations.

#### [MODIFY] `services/MemoryManager.js`
- Replace `memories`, `episodic_memory`, `entity_relationships` SQL queries.

#### [MODIFY] `services/TaskDelegator.js`
- Replace `tasks`, `task_dependencies`, `task_events` SQL queries.

#### [MODIFY] `services/CostTracker.js` & `services/TokenOptimizer.js`
- Replace SQL logging for tokens and costs with MongoDB insertion.

#### [MODIFY] `services/CollaborationManager.js` & `services/AgentMessenger.js`
- Replace `collaboration_sessions` and `agent_communications` SQL queries.

#### [MODIFY] `services/PromptRegistry.js`
- Replace `prompt_templates` SQL queries.

---

### Agents

#### [MODIFY/DELETE] `agents/database/DatabaseAgent.js`
- Pending user feedback, either delete this tool or rewrite it to target MongoDB.

## Verification Plan

### Automated Tests
- Run `npm test` to ensure no PostgreSQL connection errors are thrown during startup.
- Run `node test-connections.js` (which currently tests PG) and update it to only test Mongo and Redis.

### Manual Verification
- Register a new user and login to verify the new Mongoose `User` and `Session` models work correctly.
- Send a message in the UI to ensure the LLM responds and the `ExecutionManager` does not crash looking for SQL tables.
