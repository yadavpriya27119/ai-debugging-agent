/**
 * Component 1 — Log Watcher (The Ears)
 * Watches a log file in real time and fires an event when an error is detected.
 */

const chokidar = require('chokidar');
const fs = require('fs');
const { EventEmitter } = require('events');

const ERROR_PATTERNS = [
  /TypeError/i,
  /ReferenceError/i,
  /SyntaxError/i,
  /RangeError/i,
  /Error:/i,
  /Cannot read propert/i,
  /is not a function/i,
  /ECONNREFUSED/i,
  /ENOENT/i,
  /UnhandledPromiseRejection/i,
  /MongoError/i,
  /ValidationError/i,
];

// Matches stack trace lines like:  "    at auth.js:47:12"
const STACK_TRACE_PATTERN = /at\s+(?:\S+\s+)?\(?(\/.*?\.js|.*?\.js):(\d+):(\d+)\)?/;

class LogWatcher extends EventEmitter {
  constructor(logFilePath) {
    super();
    this.logFilePath = logFilePath;
    this.lastSize = 0;
    this.buffer = '';
    this.watcher = null;
  }

  start() {
    // Ensure log file exists
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '');
      console.log(`[LogWatcher] Created log file: ${this.logFilePath}`);
    }

    this.lastSize = fs.statSync(this.logFilePath).size;
    console.log(`[LogWatcher] Watching: ${this.logFilePath}`);

    this.watcher = chokidar.watch(this.logFilePath, {
      persistent: true,
      usePolling: true,
      interval: 500,
    });

    this.watcher.on('change', () => this._readNewLines());
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('[LogWatcher] Stopped.');
    }
  }

  _readNewLines() {
    const stat = fs.statSync(this.logFilePath);
    const newSize = stat.size;

    if (newSize <= this.lastSize) return;

    const fd = fs.openSync(this.logFilePath, 'r');
    const length = newSize - this.lastSize;
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, this.lastSize);
    fs.closeSync(fd);

    this.lastSize = newSize;
    const newText = buf.toString('utf8');
    this.buffer += newText;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // keep incomplete last line in buffer

    let errorBlock = null;

    for (const line of lines) {
      const isError = ERROR_PATTERNS.some((p) => p.test(line));

      if (isError) {
        errorBlock = { errorLine: line, stackLines: [] };
      } else if (errorBlock && line.trim().startsWith('at ')) {
        errorBlock.stackLines.push(line);
      } else if (errorBlock) {
        // End of error block — emit it
        this._processErrorBlock(errorBlock);
        errorBlock = null;
      }
    }

    // If buffer ended while still in an error block
    if (errorBlock && errorBlock.stackLines.length > 0) {
      this._processErrorBlock(errorBlock);
    }
  }

  _processErrorBlock(block) {
    const { errorLine, stackLines } = block;
    const fullStack = [errorLine, ...stackLines].join('\n');

    // Extract error type
    const typeMatch = errorLine.match(/^(\w+Error)/);
    const errorType = typeMatch ? typeMatch[1] : 'Error';

    // Extract file + line from first stack trace entry
    let filePath = null;
    let lineNumber = null;

    for (const sl of stackLines) {
      const m = sl.match(STACK_TRACE_PATTERN);
      if (m) {
        filePath = m[1];
        lineNumber = parseInt(m[2], 10);
        break;
      }
    }

    const errorEvent = {
      errorMessage: errorLine.trim(),
      errorType,
      stackTrace: fullStack,
      filePath,
      lineNumber,
      rawLogLine: errorLine,
      detectedAt: new Date(),
    };

    console.log(`[LogWatcher] Error detected: ${errorType} in ${filePath || 'unknown'}:${lineNumber || '?'}`);
    this.emit('error_detected', errorEvent);
  }
}

module.exports = LogWatcher;
