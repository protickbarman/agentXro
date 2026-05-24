#!/usr/bin/env node
/**
 * WebSocket Live Stream Test Client
 * Connects to the server and shows real-time agent reasoning
 */
const WebSocket = require('ws');

const WS_URL = process.argv[2] || 'ws://localhost:3000';
const API_URL = WS_URL.replace('ws', 'http');

async function main() {
  console.log('🔌 Connecting to WebSocket...', WS_URL);

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✅ Connected!');

    // Subscribe to all agent activity
    ws.send(JSON.stringify({ type: 'subscribe_all' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    switch (msg.type) {
      case 'subscribed_all':
        console.log('📡 Subscribed to all agent activity\n');
        break;

      case 'agent_step':
        const icons = {
          query_received: '📥',
          analysis_complete: '🔍',
          direct_tools: '🛠️',
          delegating: '🔄',
          llm_call: '🧠',
          llm_response: '✅',
          sub_agent_start: '🚀',
          sub_agent_complete: '🎯',
          sub_agent_error: '❌',
          response_ready: '✨',
          error: '💥',
        };
        const icon = icons[msg.step] || 'ℹ️';
        console.log(`${icon} [${msg.step}] ${msg.message}`);
        if (msg.agent) console.log(`   Agent: ${msg.agent}`);
        if (msg.provider) console.log(`   Provider: ${msg.provider}`);
        if (msg.tokens) console.log(`   Tokens: ${msg.tokens}`);
        console.log('');
        break;

      default:
        console.log(`📨 ${msg.type}:`, msg);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Disconnected');
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
    process.exit(1);
  });

  // Wait for connection, then send a test message
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Login
  console.log('\n🔑 Logging in...');
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test2@example.com', password: 'Test123!Pass' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;

  // Subscribe to a conversation
  console.log('📡 Subscribing to conversation stream...\n');

  // Send a message via /new endpoint
  console.log('📨 Sending test message...\n');
  const testMsg = process.argv[3] || 'Write a Python function to calculate fibonacci';

  fetch(`${API_URL}/new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message: testMsg }),
  }).then(res => res.json()).then(data => {
    console.log('\n✅ HTTP Response received:');
    console.log(`   Agent: ${data.data.agentType}`);
    console.log(`   Tokens: ${data.data.tokensUsed}`);
    console.log(`   Response: ${data.data.assistantMessage.content.substring(0, 100)}...`);
    console.log('\n⏸️  Waiting for WebSocket stream to finish...');
    setTimeout(() => { ws.close(); }, 2000);
  }).catch(err => {
    console.error('❌ HTTP Error:', err.message);
    ws.close();
  });
}

main();
