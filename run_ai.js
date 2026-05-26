const fs = require('fs');
const env = require('./config/env');
const { initializeTools } = require('./config/toolInit');
const toolRegistry = require('./tools/ToolRegistry');
const ToolOrchestrator = require('./services/ToolOrchestrator');

async function run() {
  const aiReq = JSON.parse(fs.readFileSync('./ai.json', 'utf-8'));
  await initializeTools();

  const orchestrator = new ToolOrchestrator({
    toolRegistry,
    apiKey: env.NIM.apiKey,
    baseUrl: env.NIM.baseUrl,
    model: aiReq.model || env.NIM.model,
    userContext: { userId: 'cli-runner', conversationId: 'cli-' + Date.now() },
  });

  let fullContent = '';

  await orchestrator.run(
    [{ role: 'user', content: aiReq.prompt }],
    {
      model: aiReq.model || env.NIM.model,
      temperature: aiReq.temperature ?? 0.3,
      max_tokens: aiReq.max_tokens ?? 4096,
    },
    {
      onSSE: (line) => {
        try {
          const jsonStr = line.startsWith('data: ') ? line.slice(6) : null;
          if (jsonStr && jsonStr !== '[DONE]') {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          }
        } catch {}
      },
      onDone: () => {
        fs.writeFileSync('btc_research.md', fullContent, 'utf-8');
        console.log('---OUTPUT---');
        console.log(fullContent);
        console.log('---END---');
        console.log('\nSaved to btc_research.md');
      },
      onToolStart: (tool, id, msg) => console.log(`  🛠 ${msg}`),
      onToolEnd: (tool, id, status, summary) => console.log(`  ${status === 'success' ? '✓' : '✕'} ${summary}`),
    }
  );
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
