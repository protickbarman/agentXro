const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * VisualizationEngine - Generate charts, plots, and visualizations
 * Part of Code Execution & Visualization skill
 */
class VisualizationEngine {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'outputs', 'visualizations');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate a visualization from data
   * @param {object} spec - Visualization specification
   * @returns {Promise<object>}
   */
  async generate(spec) {
    const {
      type = 'line',
      data,
      config = {},
      outputFormat = 'png',
    } = spec;

    const id = uuidv4();
    const filename = `${id}-${type}.${outputFormat}`;
    const filePath = path.join(this.outputDir, filename);
    const publicUrl = `/outputs/visualizations/${filename}`;

    let html = '';
    switch (type) {
      case 'line':
      case 'bar':
      case 'scatter':
      case 'pie':
        html = this._generateChartJS(type, data, config);
        break;
      case 'table':
        html = this._generateTable(data, config);
        break;
      default:
        html = this._generateChartJS('line', data, config);
    }

    // Save as HTML file (interactive)
    const htmlFilename = `${id}-${type}.html`;
    const htmlPath = path.join(this.outputDir, htmlFilename);
    fs.writeFileSync(htmlPath, html);

    // Generate SVG version if requested
    let svgContent = null;
    if (outputFormat === 'svg') {
      svgContent = `<svg width="${config.width || 600}" height="${config.height || 400}" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="30" font-family="Arial" font-size="16" font-weight="bold">${config.title || ''}</text>
        ${this._generateSVGBars(data, config)}
      </svg>`;
      fs.writeFileSync(filePath, svgContent);
    }

    const metadata = {
      id,
      type,
      format: outputFormat,
      filename: outputFormat === 'svg' ? filename : htmlFilename,
      url: outputFormat === 'svg' ? publicUrl : `/outputs/visualizations/${htmlFilename}`,
      interactive: true,
      title: config.title || '',
      dataPoints: Array.isArray(data?.x) ? data.x.length : 0,
    };

    logger.info(`Visualization generated: ${type} - ${metadata.url}`);
    return metadata;
  }

  _generateChartJS(type, data, config) {
    const { title = '', xLabel = '', yLabel = '', theme = 'light', width = 800, height = 500 } = config;
    if (!data) data = { x: [], y: [] };

    const chartConfig = {
      type,
      data: {
        labels: data.x || [],
        datasets: data.series || [
          {
            label: title || 'Data',
            data: data.y || [],
            borderColor: '#3b82f6',
            backgroundColor: type === 'pie' ? ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] : 'rgba(59, 130, 246, 0.1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: { display: !!title, text: title, font: { size: 16 } },
          legend: { display: (data.series || []).length > 1 || type === 'pie' },
        },
        scales: type !== 'pie' ? {
          x: { title: { display: !!xLabel, text: xLabel } },
          y: { title: { display: !!yLabel, text: yLabel } },
        } : undefined,
      },
    };

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  body { margin: 0; display: flex; justify-content: center; align-items: center;
         min-height: 100vh; background: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'}; }
  .chart-container { width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
<div class="chart-container"><canvas id="chart"></canvas></div>
<script>
  new Chart(document.getElementById('chart'), ${JSON.stringify(chartConfig, null, 2)});
</script>
</body>
</html>`;
  }

  _generateTable(data, config) {
    const { title = '', theme = 'light' } = config;
    const headers = data.headers || Object.keys(data.rows?.[0] || {});
    const rows = data.rows || [];

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 20px; background: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'}; }
  table { border-collapse: collapse; width: 100%; max-width: ${config.width || 800}px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; }
  tr:nth-child(even) { background: #fafafa; }
  h2 { color: ${theme === 'dark' ? '#fff' : '#333'}; }
</style>
</head>
<body>
${title ? `<h2>${title}</h2>` : ''}
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>
    ${rows.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
  </tbody>
</table>
</body>
</html>`;
  }

  _generateSVGBars(data, config) {
    if (!data?.y || data.y.length === 0) return '';
    const values = data.y;
    const max = Math.max(...values);
    const barWidth = Math.min(40, (parseInt(config.width || 600) - 60) / values.length);
    const height = parseInt(config.height || 400) - 60;

    return values.map((val, i) => {
      const barH = (val / max) * (height - 20);
      const x = 50 + i * (barWidth + 10);
      const y = height - barH;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="#3b82f6" rx="2"/>
        <text x="${x + barWidth / 2}" y="${height + 15}" text-anchor="middle" font-size="12" fill="#666">${data.x?.[i] || ''}</text>
        <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="#333">${val}</text>`;
    }).join('\n');
  }
}

module.exports = new VisualizationEngine();
