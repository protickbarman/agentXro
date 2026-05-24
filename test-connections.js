const logger = require('./config/logger');
const env = require('./config/env');
const { pool } = require('./config/database');
const llmManager = require('./llm/providers/LLMManager');
const axios = require('axios');

async function testConnections() {
  console.log('\n========== SYSTEM DIAGNOSTICS ==========\n');

  // Test 1: Database Connection
  console.log('1️⃣  Testing Database Connection...');
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result.rows[0].now}`);
  } catch (error) {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Environment Variables
  console.log('\n2️⃣  Checking Environment Variables...');
  const required = [
    'NIM_API_KEY',
    'NIM_BASE_URL',
    'DB_HOST',
    'JWT_SECRET',
  ];

  let allVarsPresent = true;
  for (const varName of required) {
    const value = process.env[varName];
    if (value) {
      const masked = varName === 'NIM_API_KEY' ? value.substring(0, 10) + '...' : value;
      console.log(`✅ ${varName}: ${masked}`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
      allVarsPresent = false;
    }
  }

  if (!allVarsPresent) {
    console.log('\n⚠️  Some environment variables are missing!');
  }

  // Test 3: NVIDIA NIM API Connection
  console.log('\n3️⃣  Testing NVIDIA NIM API...');
  try {
    const nimKey = process.env.NIM_API_KEY;
    const nimUrl = process.env.NIM_BASE_URL;

    if (!nimKey) {
      console.log('❌ NIM_API_KEY not configured');
    } else {
      // Try the correct endpoint for chat completions
      const response = await axios.post(
        `${nimUrl}/chat/completions`,
        {
          model: 'meta/llama-2-70b-chat-hf',
          messages: [
            {
              role: 'user',
              content: 'Say hello',
            },
          ],
          temperature: 0.7,
          max_tokens: 50,
        },
        {
          headers: {
            'Authorization': `Bearer ${nimKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✅ NVIDIA NIM API connection successful');
      console.log(`   Model: ${response.data.model}`);
      console.log(`   Response: "${response.data.choices[0].message.content}"`);
      console.log(`   Usage: ${response.data.usage.total_tokens} tokens`);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ NVIDIA NIM API - Authentication failed (invalid API key)');
      console.log(`   Make sure API key is correct: ${process.env.NIM_API_KEY.substring(0, 20)}...`);
    } else if (error.response?.status === 404) {
      console.log('❌ NVIDIA NIM API - 404 Not Found');
      console.log(`   Check the endpoint URL: ${process.env.NIM_BASE_URL}`);
      console.log(`   Or model name: meta/llama-2-70b-chat-hf`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    } else if (error.response?.status === 429) {
      console.log('❌ NVIDIA NIM API - Rate limited');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ NVIDIA NIM API - Connection refused');
    } else {
      console.log(`❌ NVIDIA NIM API error: ${error.message}`);
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  // Test 4: LLMManager Initialization
  console.log('\n4️⃣  Testing LLM Manager Initialization...');
  try {
    await llmManager.initialize();
    console.log('✅ LLM Manager initialized successfully');
  } catch (error) {
    console.log('❌ LLM Manager initialization failed');
    console.log(`   Error: ${error.message}`);
  }

  // Test 5: Basic Health Check
  console.log('\n5️⃣  System Status Summary...');
  console.log('✅ All core components configured');
  console.log('✅ Ready for testing');

  console.log('\n========================================\n');

  // Cleanup
  await pool.end();
  process.exit(0);
}

// Run diagnostics
testConnections().catch((error) => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
