# Xro Backend

An agent-based AI backend powered by NVIDIA NIM with a central agent, specialized assistants, tools, and real-time WebSocket streaming with non-blocking database operations.

## Architecture Overview

### System Components

1. **Agent** - Orchestrates user queries and routes them to specialized assistants based on complexity analysis
2. **Assistants**:
   - **Web Assistant** - Handles web scraping and HTTP requests
   - **Code Assistant** - Processes code execution and debugging
   - **Database Assistant** - Manages database queries
   - **Search Assistant** - Performs advanced searches
3. **Shared Tools** - Calculator, Web Search, JSON Parser, Timer
4. **Bull Queue** - Non-blocking sequential job processing for database operations
5. **WebSocket Server** - Real-time agent reasoning and metrics streaming

### Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Aiven)
- **Cache/Queue**: Redis + Bull
- **LLM Provider**: NVIDIA NIM (primary) + Fallback LLM
- **Authentication**: JWT + bcrypt
- **WebSocket**: ws
- **Testing**: Jest + Supertest

## Project Structure

```
├── agents/
│   ├── base/
│   │   ├── AgentBase.js      # Base agent class
│   │   └── AgentConfigBase.js
│   ├── agent/
│   │   └── Agent.js          # Main orchestrator agent
│   ├── web/
│   │   └── WebAssistant.js
│   ├── code/
│   │   └── CodeAssistant.js
│   ├── database/
│   │   └── DatabaseAssistant.js
│   ├── search/
│   │   └── SearchAssistant.js
│   └── AgentRegistry.js      # Agent registry singleton
├── tools/
│   ├── base/
│   │   └── Tool.js           # Base tool class
│   ├── shared/
│   │   ├── CalculatorTool.js
│   │   ├── BasicWebSearchTool.js
│   │   ├── JSONParserTool.js
│   │   └── TimerTool.js
│   └── ToolRegistry.js       # Tool registry singleton
├── queue/
│   ├── QueueManager.js       # Bull queue manager
│   └── JobProcessor.js       # Job processing handlers
├── models/
│   ├── User.js
│   ├── Conversation.js
│   ├── Message.js
│   ├── ToolExecution.js
│   ├── AgentExecution.js
│   └── Session.js
├── services/
│   └── AuthService.js        # JWT, password hashing
├── controllers/
│   ├── authController.js
│   ├── conversationsController.js
│   └── messagesController.js
├── routes/
│   ├── auth.js
│   ├── conversations.js
│   ├── messages.js
│   ├── agents.js
│   ├── tools.js
│   └── analytics.js
├── middleware/
│   ├── auth.js               # JWT middleware
│   └── rateLimiter.js        # Rate limiting
├── config/
│   ├── env.js                # Environment config
│   ├── database.js           # PostgreSQL pool
│   ├── redis.js              # Redis connection
│   ├── logger.js             # Winston logger
│   ├── agentInit.js          # Agent initialization
│   └── toolInit.js           # Tool initialization
├── llm/
│   ├── providers/
│   │   ├── BaseProvider.js
│   │   ├── NIMProvider.js
│   │   ├── FallbackProvider.js
│   │   └── LLMManager.js    # LLM orchestration
│   └── prompts/
│       └── systemPrompts.js
├── migrations/
│   ├── 001_init_schema.sql
│   └── migration-runner.js
├── tests/
│   ├── unit/
│   │   ├── agentRegistry.test.js
│   │   ├── toolRegistry.test.js
│   │   └── sharedTools.test.js
│   └── integration/
│       └── api.test.js
├── index.js                  # Express server entry point
├── worker.js                 # Bull Queue worker process
├── pm2-config.js             # PM2 configuration
├── jest.config.js            # Jest configuration
├── .env                      # Environment variables
└── .gitignore
```

## Setup Instructions

### Prerequisites

- Node.js 16+
- PostgreSQL database (Aiven or local)
- Redis server
- NVIDIA NIM API key (optional, with fallback LLM)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables** (`.env`):
   ```env
   # Server
   NODE_ENV=development
   PORT=3000

   # Database
   DB_HOST=pg-xxxxx.aivencloud.com
   DB_PORT=22082
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=your_password
   DB_SSL=true

   # Redis
   REDIS_HOST=redis-xxxxx.aivencloud.com
   REDIS_PORT=18356
   REDIS_PASSWORD=your_password

   # LLM Providers
   NIM_API_KEY=your_nim_key
   NIM_BASE_URL=https://integrate.api.nvidia.com
   FALLBACK_LLM_KEY=your_fallback_key
   FALLBACK_LLM_MODEL=gpt-3.5-turbo

   # JWT
   JWT_SECRET=your_secret_key
   JWT_EXPIRY=24h
   REFRESH_TOKEN_EXPIRY=7d

   # WebSocket
   WEBSOCKET_ENABLED=true
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start

   # Development with worker
   npm run dev:all
   ```

5. **Start the worker process** (separate terminal):
   ```bash
   npm run worker
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Conversations

- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/clear` - Clear conversation history

### Messages

- `GET /api/messages/:conversationId/messages` - Get messages
- `POST /api/messages/:conversationId/messages` - Send message (triggers agent)
- `GET /api/messages/:conversationId/messages/:messageId` - Get message
- `DELETE /api/messages/:conversationId/messages/:messageId` - Delete message

### Agent

- `GET /api/agent` - Get the main agent info
- `GET /api/agent/stats` - Get agent metrics

### Assistants

- `GET /api/assistants` - List all assistants
- `GET /api/assistants/:assistantName` - Get assistant info

### Tools

- `GET /api/tools` - List available tools
- `GET /api/tools/:toolName/schema` - Get tool schema
- `POST /api/tools/:toolName/execute` - Execute tool
- `GET /api/tools/executions` - Get tool execution history

### Analytics

- `GET /api/analytics/usage` - Get usage analytics
- `GET /api/analytics/agent` - Get agent analytics
- `GET /api/analytics/tools` - Get tool analytics

## WebSocket Events

Connect to `ws://localhost:3000`:

```javascript
// Ping/Pong
{ type: 'ping' }
// Response: { type: 'pong', timestamp: ... }

// Subscribe to queue stats
{ type: 'subscribe_queue_stats' }
// Response: { type: 'queue_stats', data: {...}, timestamp: ... }

// Subscribe to agent metrics
{ type: 'subscribe_agent_metrics' }
// Response: { type: 'agent_metrics', data: {...}, timestamp: ... }
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- tests/unit/agentRegistry.test.js
```

## Deployment

### Using PM2

```bash
# Start all processes
npm run pm2:start

# Stop all processes
npm run pm2:stop

# View logs
npm run pm2:logs
```

### Using Docker

```bash
# Build image
docker build -t xro-agent .

# Run container
docker run -p 3000:3000 --env-file .env xro-agent
```

## Key Features

✅ **Agent + Assistant System** - Agent routes complex queries to specialized assistants  
✅ **Tool-Based Architecture** - Extensible tool system with shared and specialized tools  
✅ **Non-Blocking Database Operations** - Bull Queue with sequential processing (1 worker at a time)  
✅ **Real-Time Streaming** - WebSocket support for agent reasoning and metrics  
✅ **LLM Fallback Chain** - NVIDIA NIM primary + fallback LLM with automatic retry  
✅ **JWT Authentication** - Secure token-based auth with refresh mechanisms  
✅ **Query Complexity Analysis** - Heuristic-based routing for optimal assistant selection  
✅ **Comprehensive Logging** - Winston logger with multiple transports  
✅ **Rate Limiting** - Protection against abuse  
✅ **CORS Support** - Configurable cross-origin requests  

## Phase Completion

- ✅ PHASE 1: Project Setup & Foundation
- ✅ PHASE 2: Database Layer
- ✅ PHASE 3: Authentication System
- ✅ PHASE 4: LLM Provider Integration
- ✅ PHASE 5: Base Agent Architecture
- ✅ PHASE 6: Main Agent Implementation
- ✅ PHASE 7: Shared Tools
- ✅ PHASE 8: Web Agent Implementation
- ✅ PHASE 9: Other Assistants (Code, Database, Search)
- ✅ PHASE 10: Bull Queue & Worker Process
- ✅ PHASE 11: API Routes & WebSocket
- ⏳ PHASE 12: Testing & Deployment (In Progress)

## Development Guidelines

### Adding a New Tool

1. Create class extending `Tool` base class
2. Implement `validate()` and `execute()` methods
3. Register in tool registry during initialization

### Adding a New Assistant

1. Create class extending `Agent` base class
2. Implement `execute()` method
3. Register in agent registry
4. Update complexity analysis in MainAgent if needed

### Adding a New API Endpoint

1. Create route handler in `routes/`
2. Create controller in `controllers/`
3. Mount route in `index.js`
4. Add authentication middleware if needed

## Troubleshooting

**Database Connection Failed**
- Verify PostgreSQL credentials in `.env`
- Check PostgreSQL server is running
- Ensure SSL certificate is valid

**Redis Connection Failed**
- Verify Redis credentials in `.env`
- Check Redis server is running
- Ensure no firewall blocking Redis port

**NIM API Failed**
- Verify `NIM_API_KEY` is correct
- Check NIM_BASE_URL is accessible
- Verify network connectivity
- Fallback LLM will be used automatically

**Queue Jobs Not Processing**
- Ensure worker process is running (`npm run worker`)
- Check Redis connection is active
- Monitor Bull Queue dashboard (if configured)

## Contributing

1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Submit pull request

## License

MIT

## Support

For issues or questions, open an issue on GitHub or contact the development team.
