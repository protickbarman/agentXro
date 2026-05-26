# Xro Agent — File System Plan

## Goal
Let the AI agent create, read, list, and delete managed files via tool calls, with file download cards appearing in the UI. No separate files panel — all file interaction happens through the chat.

## Architecture

```
User: "Create a Python script to sort data"
  │
  ▼
NVIDIA NIM receives message → decides tool_call: file_save({ filename: "sort_data.py", content: "..." })
  │
  ▼
ToolOrchestrator injects { _userId, _conversationId } → calls FileSaveTool
  │
  ▼
FileSaveTool:
  1. Writes content to disk: storage/files/{userId}/{convId}/{filename}
  2. Creates DB record in files table
  3. Returns { id, filename, size, download_url }
  │
  ▼
onFileCreated callback → SSE event: {"_type":"file_created", id, filename, size, download_url}
  │
  ▼
Frontend SSE parser catches _type === 'file_created' → calls onFileCreated
  │
  ▼
App.jsx onFileCreated → addFileCard(streamingMsgId, fileData)
  │
  ▼
MessageBubble reads fileCards[msg.id] → renders <FileCard> with download button
```

## Database

### files table (migration 003_create_files.sql)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK → users | ON DELETE CASCADE |
| conversation_id | UUID FK → conversations | ON DELETE CASCADE, nullable |
| filename | VARCHAR(255) | e.g. "sort_data.py" |
| mime_type | VARCHAR(100) | auto-detected |
| size_bytes | INTEGER | |
| storage_path | VARCHAR(500) | absolute path on disk |
| created_at | TIMESTAMP | DEFAULT NOW() |

Indexes: `user_id`, `conversation_id`

## Storage Layout

```
storage/files/{userId}/
  └── {conversationId}/
      ├── sort_data.py
      ├── notes.md
      └── config.json
```

## Backend

### models/File.js
- `create(userId, convId, filename, mimeType, sizeBytes, storagePath)`
- `findById(id)`
- `findByConversation(convId)`
- `findByUser(userId)`
- `delete(id)` — returns the record before deleting

### routes/files.js (all auth-protected)
- `POST /api/files` — create file (body: filename, content, conversationId)
- `GET  /api/files?conversation_id=xxx` — list files
- `GET  /api/files/:id/download` — download file (attachment header)
- `GET  /api/files/:id/content` — read raw content as JSON
- `DELETE /api/files/:id` — delete from disk + DB

### File Tools (registered in toolInit.js)

| Tool name | Schema inputs | Output |
|-----------|--------------|--------|
| `file_save` | filename, content, mimeType? | { id, filename, size, download_url } |
| `file_read_content` | fileId | { id, filename, content, size } |
| `file_list` | conversationId | { count, files: [...] } |
| `file_delete` | fileId | { deleted: true, filename, id } |

Each tool receives `_userId` and `_conversationId` injected by `ToolOrchestrator` before execution (not exposed to the LLM).

### ToolOrchestrator changes
- Constructor accepts `userContext: { userId, conversationId }`
- Before executing `file_save`, `file_read_content`, `file_list`, or `file_delete`, injects `_userId` and `_conversationId` into args
- After successful `file_save` execution, emits `onFileCreated(data)` callback

### SSE Flow
- `routes/xro.js` — both `/v1` and `/chat` routes pass `onFileCreated` callback
- Callback writes `data: {"_type":"file_created", id, filename, ...}` to SSE stream

## Frontend

### services/api.js SSE parser
- Checks `parsed._type === 'file_created'` before other handlers
- Calls `callbacks.onFileCreated?.(parsed)` and continues

### store/chatStore.js
- `fileCards: {}` — keyed by message id, value is array of file objects
- `addFileCard(msgId, card)` — appends card to the message's array
- `clearFileCards(msgId)` — removes all cards for a message

### App.jsx
- `onFileCreated` callback: finds the currently streaming agent message, calls `addFileCard(lastAiMsg.id, fileData)`

### components/FileCard.jsx
- Shows file extension badge, filename, size, and Download button
- Download uses `fetch` with `Authorization: Bearer {token}` header, creates blob URL, triggers download programmatically
- CSP-safe (no inline onclick)

### components/MessageBubble.jsx
- Reads `fileCards[msg.id]` from store (stable selector: `s => s.fileCards`, then local fallback)
- Renders `<FileCard>` list below message content when cards exist
- Copy button uses delegated click listener (not inline onclick — CSP-safe)

## Behavior Matrix

| User says | Agent action | UI result |
|-----------|-------------|-----------|
| "Create a Python script to sort data" | `file_save` tool | File card with Download button + agent description |
| "Write print('hello')" | No file tool, generates text | Markdown code block (no file card) |
| "Read my script.py" | `file_read_content` tool | Agent reads file, displays content in response |
| "What files do I have?" | `file_list` tool | Agent lists files in response text |
| "Delete sort_data.py" | `file_delete` tool + `file_save` creates nothing | Agent confirms deletion |

## Fixed Bugs

### Bug 1: CSP blocking inline onclick
- `helmet()` default CSP sets `script-src-attr 'none'`
- Markdown-rendered copy button had inline `onclick` → blocked → React throws
- **Fix:** `helmet({ contentSecurityPolicy: false })` + replaced inline onclick with delegated React `useEffect`

### Bug 2: Zustand infinite re-render loop
- `useChatStore(s => s.fileCards[msg.id] || [])` — `|| []` creates new array on every render
- `useSyncExternalStore` sees different reference → schedules re-render → loop
- **Fix:** `useChatStore(s => s.fileCards)` (stable object ref), then local `|| []`
