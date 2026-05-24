-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  reasoning_steps JSONB DEFAULT '[]',
  tool_calls JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tool Execution Logs Table
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  tool_type VARCHAR(50),
  input JSONB NOT NULL,
  output JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'executing', 'success', 'failed', 'retry')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  execution_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Agent Execution Logs Table
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50),
  input_query TEXT NOT NULL,
  output_response TEXT,
  complexity_level VARCHAR(50),
  decision_reason TEXT,
  sub_agents_involved JSONB DEFAULT '[]',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_message TEXT,
  execution_time_ms INT,
  tokens_used INT,
  llm_provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Agent Communication Logs Table
CREATE TABLE IF NOT EXISTS agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  from_agent VARCHAR(100) NOT NULL,
  to_agent VARCHAR(100) NOT NULL,
  message_type VARCHAR(50),
  message_content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
