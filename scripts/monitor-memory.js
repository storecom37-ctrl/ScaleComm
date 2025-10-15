#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess = null;
let restartCount = 0;
const maxRestarts = 5;

function startServer() {
  console.log('🚀 Starting Next.js development server...');
  
  serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=6144 --expose-gc --optimize-for-size'
    }
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    
    if (code !== 0 && restartCount < maxRestarts) {
      restartCount++;
      console.log(`🔄 Restarting server (attempt ${restartCount}/${maxRestarts})...`);
      setTimeout(() => {
        startServer();
      }, 2000);
    } else if (restartCount >= maxRestarts) {
      console.error('❌ Maximum restart attempts reached. Please check the logs.');
      process.exit(1);
    }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server monitor...');
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server monitor...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Start the server
startServer();
