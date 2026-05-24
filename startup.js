#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

/**
 * Startup Orchestrator
 * Manages setup, server, worker, and tests
 */
class StartupOrchestrator {
  constructor(mode = 'dev') {
    this.mode = mode; // 'dev' or 'prod'
    this.processes = [];
  }

  log(message, type = 'info') {
    const icons = {
      start: '🚀',
      stop: '🛑',
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warn: '⚠️',
    };
    console.log(`\n${icons[type]} [${new Date().toLocaleTimeString()}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runCommand(command, args, label) {
    return new Promise((resolve, reject) => {
      this.log(`${label}...`, 'start');
      
      const cmd = args && args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const process = spawn(cmd, [], { stdio: 'inherit', shell: true });
      
      process.on('close', (code) => {
        if (code === 0) {
          this.log(`${label} completed`, 'success');
          resolve(code);
        } else {
          this.log(`${label} failed with code ${code}`, 'error');
          reject(new Error(`${label} failed`));
        }
      });

      process.on('error', (error) => {
        this.log(`${label} error: ${error.message}`, 'error');
        reject(error);
      });

      this.processes.push(process);
    });
  }

  spawnProcess(command, args, label) {
    this.log(`Starting ${label}...`, 'start');
    
    // Build full command string (args included) to avoid deprecation warning with shell:true
    const cmd = args && args.length > 0 ? `${command} ${args.join(' ')}` : command;
    const process = spawn(cmd, [], {
      stdio: 'inherit',
      shell: true,
      detached: false,
    });

    process.on('close', (code) => {
      this.log(`${label} exited with code ${code}`, 'warn');
    });

    process.on('error', (error) => {
      this.log(`${label} error: ${error.message}`, 'error');
    });

    this.processes.push(process);
    return process;
  }

  cleanup() {
    this.log('Shutting down...', 'stop');
    for (const proc of this.processes) {
      try {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      } catch (e) {
        // Ignore
      }
    }
    process.exit(0);
  }

  async start() {
    // Trap Ctrl+C / SIGTERM — kill children + exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('SIGHUP', () => this.cleanup());

    try {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 XRO AGENT BACKEND');
      console.log(`Mode: ${this.mode.toUpperCase()}`);
      console.log('='.repeat(70));

      if (this.mode === 'prod') {
        // Step 1: Setup (migrations, seed data) — only in prod
        this.log('STEP 1: Database Setup', 'info');
        await this.runCommand('node', ['setup.js'], 'Database setup');
        await this.sleep(2000);
      }

      // Start server
      this.log('Starting Server...', 'info');
      if (this.mode === 'dev') {
        this.spawnProcess('nodemon', ['index.js'], 'Server (dev mode)');
      } else {
        this.spawnProcess('node', ['index.js'], 'Server (production)');
      }
      await this.sleep(3000);

      // Start worker (non-blocking)
      this.log('Starting Queue Worker...', 'info');
      if (this.mode === 'dev') {
        this.spawnProcess('nodemon', ['worker.js'], 'Queue Worker (dev mode)');
      } else {
        this.spawnProcess('node', ['worker.js'], 'Queue Worker');
      }
      await this.sleep(2000);

      console.log('\n' + '='.repeat(70));
      console.log('✅ DEV SERVER RUNNING');
      console.log('='.repeat(70));
      console.log('   • Server:  http://localhost:3000');
      console.log('   • WS:      ws://localhost:3000');
      console.log('\n⏸️  Press Ctrl+C to stop\n');

      // Keep alive until Ctrl+C
      await new Promise(() => {});
    } catch (error) {
      this.log(`Startup failed: ${error.message}`, 'error');
      this.cleanup();
    }
  }
}

// Get mode from command line args
const mode = process.argv[2] === 'prod' ? 'prod' : 'dev';

// Start orchestrator
const orchestrator = new StartupOrchestrator(mode);
orchestrator.start();
