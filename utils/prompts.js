// LLM prompts for different agents

const mainAgentPrompts = {
  queryAnalysis: `
You are an advanced query analyzer. Analyze the following user query and classify it:
1. Complexity Level: simple, medium, or complex
2. Required Capabilities: List the capabilities needed
3. Recommended Agent(s): Suggest which agent(s) should handle this

Query: {query}

Respond in JSON format:
{
  "complexity": "simple|medium|complex",
  "reasoning": "explanation",
  "requiredCapabilities": ["capability1", "capability2"],
  "recommendedAgents": ["agent1", "agent2"],
  "shouldUseDirect Tools": true/false,
  "estimatedExecutionTime": 500
}
  `,

  coordination: `
You are coordinating multiple AI agents to solve this task:
{task}

Available agents:
- Web Agent: Scraping, form submission, data extraction
- Code Agent: Code execution, debugging, analysis
- Database Agent: Complex queries, data management
- Search Agent: Advanced search, information synthesis

Decompose the task and assign to appropriate agents.
Response format:
{
  "steps": [
    {
      "stepNumber": 1,
      "agent": "agent_name",
      "task": "specific task",
      "inputs": {},
      "expectedOutput": "description"
    }
  ],
  "executionOrder": "sequential|parallel",
  "aggregationStrategy": "how to combine results"
}
  `,
};

const webAgentPrompts = {
  scraping: `
You are a web scraping agent. Your task is to scrape the website and extract data.

URL: {url}
Target Data: {dataDescription}
Constraints: {constraints}

Plan your scraping strategy:
1. Determine if static or dynamic content
2. Identify CSS selectors/XPath
3. Handle pagination/infinite scroll
4. Data validation approach

Return JSON with your strategy.
  `,

  formSubmission: `
You are a form automation agent. Analyze this form and plan submission.

Form HTML: {html}
Data to Submit: {data}

Plan:
1. Identify form fields and their types
2. Validation rules
3. Submission method
4. Expected response handling

Return JSON with your plan.
  `,
};

const codeAgentPrompts = {
  execution: `
You are a code execution agent. Execute this code safely:

Code:
\`\`\`
{code}
\`\`\`

Input: {input}

Execute and return:
1. Output
2. Any errors
3. Execution time
4. Memory usage
5. Performance notes
  `,

  debugging: `
You are a debugging agent. Debug this code:

Code:
\`\`\`
{code}
\`\`\`

Error: {error}

Provide:
1. Root cause analysis
2. Suggested fixes
3. Corrected code
4. Prevention tips
  `,
};

const databaseAgentPrompts = {
  queryGeneration: `
You are a database query agent. Generate SQL for this request:

Schema: {schema}
Request: {request}
Database Type: {dbType}

Generate optimized SQL query and return:
{
  "query": "SELECT ...",
  "parameters": {},
  "reasoning": "explanation",
  "performanceNotes": "any optimization notes"
}
  `,

  dataAnalysis: `
You are a data analysis agent. Analyze this data:

Data: {data}
Analysis Type: {analysisType}

Provide:
1. Key insights
2. Patterns identified
3. Anomalies
4. Recommendations
5. Visualizations suggestions
  `,
};

const searchAgentPrompts = {
  synthesis: `
You are an information synthesis agent. Combine these search results:

Query: {query}
Results: {results}
SourceCount: {sourceCount}

Synthesize into:
1. Comprehensive summary
2. Key points
3. Conflicting information (if any)
4. Sources and citations
5. Confidence level per claim

Return structured JSON.
  `,

  aggregation: `
You are a data aggregation agent. Aggregate data from multiple sources:

Task: {task}
Sources: {sources}

Aggregate and return:
1. Combined dataset
2. Data quality assessment
3. Conflicts/inconsistencies
4. Missing data
5. Recommendations
  `,
};

module.exports = {
  mainAgentPrompts,
  webAgentPrompts,
  codeAgentPrompts,
  databaseAgentPrompts,
  searchAgentPrompts,
};
