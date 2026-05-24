#!/usr/bin/env node
/**
 * Live Stream Viewer - Shows ALL agent steps in real-time
 * Usage: node live-stream.js
 */
const WebSocket = require('ws');
const http = require('http');

const WS_URL = 'ws://localhost:3000';
const API_URL = 'http://localhost:3000';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.log('❌ Usage: node live-stream.js <TOKEN>');
  console.log('   Get token: curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"test2@example.com","password":"Test123!Pass"}\' | grep -o \'"accessToken":"[^"]*"\' | cut -d\'"\' -f4');
  process.exit(1);
}

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('🔌 Connected to WebSocket');
  ws.send(JSON.stringify({ type: 'subscribe_all' }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  switch (msg.type) {
    case 'subscribed_all':
      console.log('📡 Listening for all agent activity...\n');
      break;

    case 'agent_step':
      const styles = {
        query_received:     { icon: '📥', color: '\x1b[36m', label: 'QUERY RECEIVED' },
        acknowledgment:     { icon: '💬', color: '\x1b[33m', label: 'ACKNOWLEDGMENT' },
        analysis_complete:  { icon: '🔍', color: '\x1b[35m', label: 'ANALYSIS' },
        delegating:         { icon: '🔄', color: '\x1b[34m', label: 'ROUTING' },
        sub_agent_start:    { icon: '🚀', color: '\x1b[32m', label: 'AGENT CALLED' },
        sub_agent_output:   { icon: '📄', color: '\x1b[37m', label: 'AGENT OUTPUT' },
        sub_agent_complete: { icon: '✅', color: '\x1b[32m', label: 'AGENT DONE' },
        sub_agent_error:    { icon: '❌', color: '\x1b[31m', label: 'AGENT ERROR' },
        llm_call:           { icon: '🧠', color: '\x1b[35m', label: 'LLM CALL' },
        llm_response:       { icon: '💡', color: '\x1b[35m', label: 'LLM RESPONSE' },
        direct_tools:       { icon: '🛠️', color: '\x1b[36m', label: 'DIRECT TOOLS' },
        response_ready:     { icon: '✨', color: '\x1b[33m', label: 'RESPONSE READY' },
        final_response:     { icon: '🎯', color: '\x1b[32m', label: 'FINAL RESPONSE' },
        error:              { icon: '💥', color: '\x1b[31m', label: 'ERROR' },
      };

      const style = styles[msg.step] || { icon: 'ℹ️', color: '\x1b[0m', label: msg.step.toUpperCase() };
      const reset = '\x1b[0m';

      console.log(`${style.color}${style.icon} [${style.label}]${reset} ${msg.message}`);
      if (msg.agent) console.log(`   ${style.color}Agent: ${msg.agent}${reset}`);
      if (msg.provider) console.log(`   ${style.color}Provider: ${msg.provider}${reset}`);
      if (msg.tokens) console.log(`   ${style.color}Tokens: ${msg.tokens}${reset}`);
      if (msg.output) console.log(`   ${style.color}Output: ${msg.output.substring(0, 200)}...${reset}`);
      console.log('');
      break;

    case 'final_response':
      console.log('\n\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
      console.log('\x1b[1m🎯 FINAL RESPONSE:\x1b[0m');
      console.log(msg.content);
      console.log('\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
      break;

    default:
      console.log(`📨 ${msg.type}:`, JSON.stringify(msg).substring(0, 100));
  }
});

ws.on('close', () => {
  console.log('\n🔌 Disconnected');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

// Wait for connection, then send a test message
setTimeout(async () => {
  const userMessage = process.argv[3] || 'Research about Bitcoin';

  console.log(`\n📨 Sending: "${userMessage}"\n`);
  console.log('\x1b[1m\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  try {
    const res = await fetch(`${API_URL}/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await res.json();

    // Show final response directly
    const content = data.data?.assistantMessage?.content || 'No response';
    const agentType = data.data?.agentType || 'unknown';
    const tokens = data.data?.tokensUsed || 0;

    console.log('\n\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('\x1b[1m🎯 FINAL RESPONSE:\x1b[0m');
    console.log(content);
    console.log(`\n\x1b[1m   Agent: ${agentType} | Tokens: ${tokens}\x1b[0m`);
    console.log('\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

    // Broadcast final to other clients (not ourselves)
    ws.send(JSON.stringify({
      type: 'final_response',
      content: content.substring(0, 500),
      agentType,
      tokensUsed: tokens,
    }));

    console.log('\n⏸️  Waiting 3 seconds for stream to finish...');
    setTimeout(() => { ws.close(); }, 3000);
  } catch (err) {
    console.error('❌ HTTP Error:', err.message);
    ws.close();
  }
}, 1000);
