# XRO Agent

Full-stack multi-agent AI chat application.

## Stack
- **Backend**: Node.js / Express on port 3000
- **Frontend**: React 19 + Vite on port 5000
- **Auth DB**: PostgreSQL (Aiven) — users + sessions only
- **Chat DB**: MongoDB — all chat data (conversations, messages, files, tool/agent executions)
- **State**: Zustand
- **Streaming**: SSE via `/xro/v1`
- **Workflow**: `npx concurrently "node index.js" "npm run ui"`

## Architecture
- All DB writes are **fire-and-forget after full response** — never block the SSE stream
- `queue/QueueManager.js` wraps Bull (Redis) with in-process direct fallback
- `queue/JobProcessor.js` routes jobs to MongoDB (chat) or PostgreSQL (sessions)
- `models/Conversation.js` — MongoDB, uses provided ID (never generates its own)
- Token pre-warmed on app mount to eliminate first-message delay

## Key Files
- `App.jsx` — SSE lifecycle, file cards, conversation management
- `routes/xro.js` — main SSE endpoint (`POST /xro/v1`)
- `components/MessageBubble.jsx` — blocks renderer (text / reasoning / tool)
- `components/ActionsGroup.jsx` — collapsible group for 2+ tool/reasoning blocks
- `components/ThinkingCard.jsx` — reasoning block, styled same as ToolStepRow
- `components/ToolStepRow.jsx` — file tools always show "Done", no path reveal
- `store/chatStore.js` — streamingBlocks, fileCards, migrateConv (clears temp)
- `config/mongodb.js` — retry connect
- `config/env.js` — all secrets including MONGODB_URI

## UI / UX Rules
- **ThinkingCard** matches `.tsr` row style (compact horizontal row, expand on click)
- **ActionsGroup**: single block → inline; 2+ blocks → collapsible group header
- **File cards** (`FileCard.jsx`) show below agent message with download button
- **Tool step description** for file-write tools always shows "Done" (no path)
- **Streaming**: blocks auto-expand during stream, auto-collapse when done
- **60fps**: GPU layers on chat-main + messages-scroll; `contain: layout style` on rows
- **Auth pages**: glassmorphism card, gradient button, shake animation on error

## User Preferences
- Save memory/preferences to `replit.md` at the end of every work session
- DB must never block the SSE stream — all saves are background/deferred
- When 2+ tool calls or thinking + tools arrive, group them in one collapsible container
- File cards (download button) MUST show; tool step row for file-write shows "Done" only
- ThinkingCard and ToolStepRow must share the same visual style
- Old PostgreSQL conversations are lost after MongoDB migration (expected)
- Sidebar shows only new MongoDB-persisted conversations
