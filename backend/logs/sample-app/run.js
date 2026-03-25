/**
 * This runner executes userRoutes.js and writes
 * any errors to ../app.log (the file being watched by the agent)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../app.log');
const TARGET_FILE = path.join(__dirname, 'userRoutes.js');

console.log('Running userRoutes.js...');
console.log('Agent is watching:', LOG_FILE);
console.log('');

const result = spawnSync('node', [TARGET_FILE], { encoding: 'utf8' });
const errorOutput = result.stderr || result.stdout || '';

if (errorOutput && errorOutput.includes('Error')) {
  // Write EACH error line separately so LogWatcher picks them up
  const logLine = `[${new Date().toISOString()}] ${errorOutput.trim()}\n`;
  fs.appendFileSync(LOG_FILE, logLine);

  console.log('❌ Error written to log file!');
  console.log('Error preview:', errorOutput.split('\n')[0]);
  console.log('');
  console.log('✅ Agent is now detecting this...');
  console.log('   Watch backend terminal for: [Pipeline] Complete! PR: ...');
} else {
  console.log('No errors detected in output.');
}
