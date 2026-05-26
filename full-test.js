const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

/**
 * Full Test Suite - Tests all API endpoints
 */
class TestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
    this.tokens = {};
  }

  log(message, type = 'info') {
    const icons = {
      pass: '✅',
      fail: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      test: '🧪',
    };
    console.log(`${icons[type]} ${message}`);
  }

  async test(name, method, url, data, expectedStatus) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.tokens.access) {
        config.headers.Authorization = `Bearer ${this.tokens.access}`;
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      
      if (response.status === expectedStatus) {
        this.log(`${name} (${response.status})`, 'pass');
        this.passed++;
        return response.data;
      } else {
        this.log(`${name} - Expected ${expectedStatus}, got ${response.status}`, 'fail');
        this.failed++;
        return null;
      }
    } catch (error) {
      if (error.response?.status === expectedStatus) {
        this.log(`${name} (${error.response.status})`, 'pass');
        this.passed++;
        return error.response.data;
      } else {
        const status = error.response?.status || 'ERROR';
        this.log(`${name} - Expected ${expectedStatus}, got ${status}: ${error.message.substring(0, 50)}`, 'fail');
        this.failed++;
        return null;
      }
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 XRO AGENT BACKEND - FULL TEST SUITE');
    console.log('='.repeat(60) + '\n');

    // 1. Health Check
    console.log('\n📋 1. HEALTH CHECK TESTS');
    console.log('-'.repeat(60));
    await this.test('Health check', 'GET', '/health', null, 200);

    // 2. Agent & Assistant Tests
    console.log('\n📋 2. AGENT & ASSISTANT TESTS');
    console.log('-'.repeat(60));
    await this.test('List all assistants', 'GET', '/api/assistants', null, 200);
    await this.test('Get agent stats', 'GET', '/api/agent/stats', null, 200);
    await this.test('Get the agent', 'GET', '/api/agent', null, 200);
    await this.test('Get nonexistent assistant', 'GET', '/api/assistants/fake', null, 404);

    // 3. Tools Tests
    console.log('\n📋 3. TOOLS TESTS');
    console.log('-'.repeat(60));
    await this.test('List all tools', 'GET', '/api/tools', null, 200);
    await this.test('Get calculator schema', 'GET', '/api/tools/calculator/schema', null, 200);
    await this.test('Get timer schema', 'GET', '/api/tools/timer/schema', null, 200);
    await this.test('Get nonexistent tool', 'GET', '/api/tools/fake/schema', null, 404);

    // 4. Authentication Tests
    console.log('\n📋 4. AUTHENTICATION TESTS');
    console.log('-'.repeat(60));
    
    // Generate alphanumeric-only username (no underscores)
    const timestamp = Date.now().toString().slice(-6);
    const registerData = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'Test123!Password',
    };
    const registerResult = await this.test('Register user', 'POST', '/api/auth/register', registerData, 201);
    
    if (registerResult?.data?.user) {
      const loginResult = await this.test('Login user', 'POST', '/api/auth/login', {
        email: registerData.email,
        password: registerData.password,
      }, 200);

      if (loginResult?.data?.token) {
        this.tokens.access = loginResult.data.token;
        await this.test('Get current user (with auth)', 'GET', '/api/auth/me', null, 200);
      }
    }

    // 5. Conversation Tests (requires auth)
    console.log('\n📋 5. CONVERSATION TESTS');
    console.log('-'.repeat(60));

    if (this.tokens.access) {
      const conversationResult = await this.test(
        'Create conversation',
        'POST',
        '/api/conversations',
        { title: 'Test Conversation', description: 'Test' },
        201
      );

      if (conversationResult?.data?.id) {
        const conversationId = conversationResult.data.id;
        this.tokens.conversationId = conversationId;

        await this.test('List conversations', 'GET', '/api/conversations', null, 200);
        await this.test('Get specific conversation', 'GET', `/api/conversations/${conversationId}`, null, 200);
        await this.test('Update conversation', 'PUT', `/api/conversations/${conversationId}`, { title: 'Updated' }, 200);
      }
    } else {
      this.log('Conversation tests skipped (auth failed - check username validation)', 'warn');
    }

    // 6. Analytics Tests (requires auth)
    console.log('\n📋 6. ANALYTICS TESTS');
    console.log('-'.repeat(60));

    if (this.tokens.access) {
      await this.test('Get agent analytics', 'GET', '/api/analytics/agent', null, 200);
      await this.test('Get usage analytics', 'GET', '/api/analytics/usage', null, 200);
    } else {
      this.log('Analytics requires auth token', 'warn');
    }

    // 7. Error Handling Tests
    console.log('\n📋 7. ERROR HANDLING TESTS');
    console.log('-'.repeat(60));
    await this.test('Nonexistent route', 'GET', '/api/nonexistent', null, 404);
    await this.test('Tool execute without auth', 'POST', '/api/tools/calculator/execute', { params: { expression: '1+1' } }, 401);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Run tests
const suite = new TestSuite();
suite.run().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
