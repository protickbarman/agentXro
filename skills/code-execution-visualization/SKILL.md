---
name: code-execution-visualization
description: Safe code execution, interactive visualization, output rendering, and result display. Use when agents need to execute code, generate charts/plots, create visualizations, display interactive outputs, or preview code results.
compatibility:
  requires:
    - CodeExecutor tool (tools/shared/CodeExecutor)
    - CodeAgent (agents/code/)
    - Output directory (outputs/)
  dependencies:
    - Agent Communication skill (for multi-step code + visualization workflows)
---

# Code Execution & Visualization Skill

This skill provides safe code execution, interactive visualization generation, output rendering, and result display capabilities.

## Architecture Overview

```
Code Execution & Visualization
├── CodeExecutor             → Existing code execution (enhanced)
├── VisualizationEngine      → Chart/plot generation (NEW)
├── OutputRenderer           → Result formatting and display (NEW)
├── SandboxManager           → Secure execution environment (NEW)
├── ResultCache              → Cached execution results (NEW)
└── ExecutionAPI             → REST + WebSocket endpoints (NEW)
```

## Execution Environments

| Environment | Languages | Use Case | Security |
|-------------|-----------|----------|----------|
| **sandbox** | Python, JavaScript | General execution | Full sandbox, no network |
| **visualization** | Python (matplotlib, plotly) | Charts and plots | Restricted, no file write |
| **analysis** | Python (pandas, numpy) | Data analysis | Restricted read-only |
| **quick** | JavaScript | Quick snippets | Limited CPU, 5s timeout |

## Execution Request Schema

```javascript
{
  id: UUID,
  language: 'python' | 'javascript' | 'node',
  code: string,                        // Code to execute
  input: any,                          // Input data
  environment: 'sandbox' | 'visualization' | 'analysis' | 'quick',
  timeout: number,                     // Execution timeout (ms)
  outputFormat: 'text' | 'json' | 'html' | 'image' | 'dataframe',
  options: {
    packages: string[],                // Required packages
    files: { name: string, content: string }[],  // Input files
    env: { key: value },              // Environment variables
    networkAccess: boolean,
  },
  cacheKey: string,                    // If set, cache the result
}
```

## Execution Result Schema

```javascript
{
  id: UUID,
  success: boolean,
  output: {
    text: string,                      // stdout
    error: string,                     // stderr
    result: any,                       // Return value
    visualizations: [                  // Generated visuals
      {
        type: 'chart' | 'plot' | 'html' | 'svg',
        format: 'png' | 'svg' | 'html',
        url: string,                   // Public URL
        data: any,                     // Raw data for rendering
      }
    ],
    files: [                          // Generated files
      { name: string, url: string, type: string }
    ],
  },
  metrics: {
    executionTime: number,
    memoryUsed: number,
    tokensUsed: number,
  },
  cached: boolean,
}
```

## Visualization Types

### 1. Static Charts (matplotlib)
```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title('Sine Wave')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.savefig('/outputs/chart.png')
```

### 2. Interactive Charts (plotly)
```python
import plotly.express as px
import pandas as pd

df = pd.DataFrame({
    'x': [1, 2, 3, 4, 5],
    'y': [10, 15, 13, 17, 20],
})
fig = px.line(df, x='x', y='y', title='Interactive Chart')
fig.write_html('/outputs/chart.html')
```

### 3. Data Tables (pandas)
```python
import pandas as pd
df = pd.read_csv('data.csv')
summary = df.describe()
# Display as formatted table
```

### 4. Custom HTML/JS Visualizations
```html
<div id="chart"></div>
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script>
  Plotly.newPlot('chart', [{ x: [1,2,3], y: [4,5,6], type: 'scatter' }]);
</script>
```

## Execution Flow

### Step 1: Submit Code
```javascript
const result = await CodeExecutor.execute({
  language: 'python',
  environment: 'visualization',
  code: `
import matplotlib.pyplot as plt
import numpy as np

data = np.random.randn(1000)
plt.hist(data, bins=30)
plt.title('Data Distribution')
plt.savefig('/outputs/histogram.png')
print(f"Mean: {data.mean():.2f}, Std: {data.std():.2f}")
  `,
  outputFormat: 'text',
  options: { packages: ['matplotlib', 'numpy'] },
});
```

### Step 2: Process Results
```javascript
// Check for visualizations
if (result.output.visualizations.length > 0) {
  for (const viz of result.output.visualizations) {
    // Display inline
    console.log(`![Chart](${viz.url})`);
    
    // Or return URL for download
    output.files.push({ name: 'histogram.png', url: viz.url });
  }
}

// Handle text output
if (result.output.text) {
  console.log('Output:', result.output.text);
}
```

### Step 3: Cache Results (Optional)
```javascript
// Cache by code hash for 5 minutes
const cached = await ResultCache.get(codeHash);
if (cached) {
  return cached;
}
const result = await execute(code);
await ResultCache.set(codeHash, result, { ttl: 300000 });
```

## Sandbox Manager

### Security Configuration
```javascript
const sandbox = await SandboxManager.create({
  language: 'python',
  timeout: 30000,
  memoryLimit: 512,       // MB
  networkAccess: false,
  allowedPackages: [
    'matplotlib', 'numpy', 'pandas', 'plotly',
    'scipy', 'seaborn', 'json', 'csv',
  ],
  blockedModules: ['os', 'subprocess', 'sys', 'shutil'],
  allowedPaths: ['/outputs/', '/tmp/'],
});
```

## Visualization Engine

### Generate Chart from Data
```javascript
const viz = await VisualizationEngine.generate({
  type: 'line',            // line | bar | scatter | pie | histogram | heatmap
  data: {
    x: ['Jan', 'Feb', 'Mar', 'Apr'],
    y: [100, 150, 130, 180],
    series: [{ name: 'Revenue', data: [100, 150, 130, 180] }],
  },
  config: {
    title: 'Monthly Revenue',
    xLabel: 'Month',
    yLabel: 'Revenue ($)',
    theme: 'dark',          // dark | light
    interactive: true,
    width: 800,
    height: 500,
  },
  outputFormat: 'png',
});
```

### Supported Visualization Types

| Type | Description | Libraries |
|------|-------------|-----------|
| line | Line charts | matplotlib, plotly |
| bar | Bar/column charts | matplotlib, plotly |
| scatter | Scatter plots | matplotlib, plotly |
| pie | Pie charts | matplotlib, plotly |
| histogram | Distribution plots | matplotlib, plotly, seaborn |
| heatmap | Correlation heatmaps | matplotlib, seaborn, plotly |
| box | Box plots | matplotlib, plotly, seaborn |
| 3d | 3D surface/line plots | matplotlib, plotly |
| table | Data tables | pandas, custom HTML |
| custom | Custom HTML/JS | Any |

## Database Schema

```sql
-- Execution history
CREATE TABLE IF NOT EXISTS code_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language VARCHAR(50) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  code_hash VARCHAR(64),
  code_preview TEXT,
  success BOOLEAN,
  output_summary TEXT,
  execution_time_ms INTEGER,
  memory_used_mb NUMERIC(8,2),
  tokens_used INTEGER,
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visualization assets
CREATE TABLE IF NOT EXISTS visualization_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES code_executions(id),
  viz_type VARCHAR(50) NOT NULL,
  format VARCHAR(10) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution cache
CREATE TABLE IF NOT EXISTS execution_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash VARCHAR(64) UNIQUE NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /api/execute
Execute code and return results.

### GET /api/execute/:id
Get execution details and results.

### GET /api/visualizations
List generated visualizations.

### GET /api/visualizations/:id
Get visualization details.

### POST /api/visualizations/generate
Generate a visualization from data.

### GET /api/execute/status/:id
Get execution status (for long-running tasks).

## WebSocket Events

- `execution:started` — Code execution began
- `execution:progress` — Real-time output stream
- `execution:completed` — Execution finished
- `execution:error` — Execution error
- `visualization:generated` — New visualization created

## Guidelines

1. **Always sandbox** — Never execute user code without sandboxing. Use the sandbox manager.
2. **Set timeouts** — Default: 30s for sandbox, 10s for quick. Never allow infinite execution.
3. **Block dangerous modules** — Block `os`, `subprocess`, `sys`, `shutil`, `socket` in user code.
4. **Cache when possible** — Identical code (by hash) should return cached results for 5 minutes.
5. **Stream output** — For long-running executions, stream stdout/stderr in real-time via WebSocket.
6. **Limit output size** — Cap output at 1MB; truncate if exceeded.
7. **Provide download URLs** — Generated files (images, HTML, CSVs) should be accessible via /outputs/.
8. **Show inline where possible** — Visualizations should be displayed inline in the conversation.

## References

- See `references/sandbox-security.md` for sandbox configuration
- See `references/viz-examples.md` for visualization templates
- See `scripts/run-code.js` for CLI execution
- See `scripts/generate-dashboard.js` for dashboard generation

## Examples

**Example 1: Data analysis with visualization**
```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

data = pd.DataFrame({
    'category': ['A', 'B', 'C', 'D'],
    'values': [23, 45, 56, 78],
    'growth': [0.15, 0.22, -0.05, 0.30],
})

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
sns.barplot(data=data, x='category', y='values', ax=ax1)
ax1.set_title('Values by Category')
sns.lineplot(data=data, x='category', y='growth', marker='o', ax=ax2)
ax2.set_title('Growth Rate')
plt.tight_layout()
plt.savefig('/outputs/analysis.png')
print(data.to_string())
```

**Example 2: Real-time streaming execution**
```
User asks: "Calculate fibonacci(50)"
→ WebSocket: execution:started
→ Code executes in sandbox (15ms)
→ WebSocket: execution:progress "Computing..."
→ WebSocket: execution:completed
→ Result: "12586269025" (shown inline)
```
