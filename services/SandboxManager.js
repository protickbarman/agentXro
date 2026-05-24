const logger = require('../config/logger');

/**
 * SandboxManager - Secure code execution sandbox
 * Part of Code Execution & Visualization skill
 */
class SandboxManager {
  constructor() {
    this.sandboxes = new Map();
    this.DEFAULT_CONFIG = {
      timeout: 30000,
      memoryLimit: 512,
      networkAccess: false,
      allowedPackages: [],
      blockedModules: ['child_process', 'cluster', 'net', 'dgram', 'dns', 'http2', 'https', 'http', 'os', 'path'],
      allowedPaths: [],
    };
  }

  /**
   * Create a new sandboxed execution environment
   * @param {object} config - Sandbox configuration
   * @returns {object}
   */
  create(config = {}) {
    const id = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sandboxConfig = { ...this.DEFAULT_CONFIG, ...config };

    const sandbox = {
      id,
      config: sandboxConfig,
      createdAt: new Date(),
      activeExecutions: 0,
      totalExecutions: 0,
    };

    this.sandboxes.set(id, sandbox);
    logger.info(`Sandbox created: ${id}`);
    return sandbox;
  }

  /**
   * Validate code before execution
   * @param {string} code - Code to validate
   * @param {object} config - Sandbox config
   * @returns {object} - { valid: boolean, errors: string[] }
   */
  validate(code, config = {}) {
    const blockedModules = config.blockedModules || this.DEFAULT_CONFIG.blockedModules;
    const errors = [];

    // Check for blocked imports/requires
    for (const mod of blockedModules) {
      const patterns = [
        new RegExp(`require\\s*\\(\\s*['"\`]${mod}['"\`]\\s*\\)`, 'g'),
        new RegExp(`from\\s+['"\`]${mod}['"\`]`, 'g'),
        new RegExp(`import\\s+['"\`]${mod}['"\`]`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(code)) {
          errors.push(`Blocked module: ${mod}`);
        }
      }
    }

    // Check for eval/Function constructor abuse
    if (/eval\s*\(/.test(code) && !config.allowEval) {
      errors.push('eval() is not allowed in sandbox');
    }

    // Check for process global access
    if (/process\.\w+/.test(code) && !config.allowProcess) {
      errors.push('Direct process access is not allowed');
    }

    // Check for __dirname/__filename
    if (/__dirname/.test(code) || /__filename/.test(code)) {
      errors.push('__dirname/__filename access is not allowed');
    }

    // Check code size
    if (code.length > 100000) {
      errors.push('Code exceeds maximum length (100KB)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: code.length > 50000 ? ['Code is large (>50KB), may be slow to execute'] : [],
    };
  }

  /**
   * Execute code in sandbox
   * @param {object} execution - Execution request
   * @returns {Promise<object>}
   */
  async execute(execution) {
    const { code, language, input, sandboxId, timeout } = execution;

    if (!sandboxId) throw new Error('Sandbox ID is required');

    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error(`Sandbox not found: ${sandboxId}`);

    // Validate
    const validation = this.validate(code, sandbox.config);
    if (!validation.valid) {
      return {
        success: false,
        output: { text: '', error: validation.errors.join('\n'), result: null },
        metrics: { executionTime: 0, memoryUsed: 0 },
      };
    }

    sandbox.activeExecutions++;
    sandbox.totalExecutions++;

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    try {
      if (language === 'javascript' || language === 'node') {
        const result = await this._executeJavaScript(code, input, timeout || sandbox.config.timeout);
        stdout = result.stdout;
        stderr = result.stderr;

        return {
          success: !stderr,
          output: { text: stdout, error: stderr, result: result.data },
          metrics: { executionTime: Date.now() - startTime, memoryUsed: 0 },
          sandboxId,
        };
      } else {
        return {
          success: false,
          output: { text: '', error: `Language not supported in sandbox: ${language}`, result: null },
          metrics: { executionTime: 0, memoryUsed: 0 },
          sandboxId,
        };
      }
    } catch (error) {
      return {
        success: false,
        output: { text: stdout, error: error.message, result: null },
        metrics: { executionTime: Date.now() - startTime, memoryUsed: 0 },
        sandboxId,
      };
    } finally {
      sandbox.activeExecutions--;
    }
  }

  async _executeJavaScript(code, input, timeout) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const errorChunks = [];
      let timeoutId;

      const { spawn } = require('child_process');
      const nodePath = process.execPath;

      const sandboxCode = `
        const input = ${JSON.stringify(input || '')};
        let __result__;
        __result__ = eval(${JSON.stringify(code)});
        if (__result__ !== undefined) console.log(JSON.stringify(__result__));
      `;

      const child = spawn(nodePath, ['-e', sandboxCode], {
        timeout,
        env: { NODE_ENV: 'sandbox', ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);

      child.stdout.on('data', (data) => chunks.push(data.toString()));
      child.stderr.on('data', (data) => errorChunks.push(data.toString()));

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const stdout = chunks.join('');
        let data = null;
        try {
          const trimmed = stdout.trim();
          if (trimmed) data = JSON.parse(trimmed);
        } catch { /* not JSON output, keep as null */ }
        resolve({
          stdout,
          stderr: errorChunks.join(''),
          exitCode: code,
          data,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      if (input) {
        child.stdin.write(typeof input === 'string' ? input : JSON.stringify(input));
        child.stdin.end();
      }
    });
  }

  /**
   * Destroy a sandbox and release resources
   * @param {string} id - Sandbox ID
   */
  destroy(id) {
    const sandbox = this.sandboxes.get(id);
    if (sandbox) {
      if (sandbox.activeExecutions > 0) {
        logger.warn(`Destroying sandbox with ${sandbox.activeExecutions} active executions`);
      }
      this.sandboxes.delete(id);
      logger.info(`Sandbox destroyed: ${id}`);
    }
  }

  /**
   * Get sandbox metrics
   * @returns {object}
   */
  getMetrics() {
    return {
      activeSandboxes: this.sandboxes.size,
      totalSandboxesCreated: this.sandboxes.size,
      totalExecutions: Array.from(this.sandboxes.values())
        .reduce((s, sb) => s + sb.totalExecutions, 0),
      activeExecutions: Array.from(this.sandboxes.values())
        .reduce((s, sb) => s + sb.activeExecutions, 0),
    };
  }
}

module.exports = new SandboxManager();
