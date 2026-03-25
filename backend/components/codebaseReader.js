/**
 * Component 2 — Codebase Reader (The Memory)
 * Reads the relevant code file around the crash point.
 */

const fs = require('fs');
const path = require('path');

const CONTEXT_LINES = 25; // Lines above and below the crash line

/**
 * Builds a context package from an error event.
 * @param {object} errorEvent - from LogWatcher
 * @returns {object} contextPackage
 */
function buildContextPackage(errorEvent) {
  const { errorMessage, errorType, stackTrace, filePath, lineNumber } = errorEvent;

  let fileContent = null;
  let relevantCode = null;
  let startLine = null;
  let endLine = null;

  if (filePath && lineNumber) {
    const resolvedPath = resolveFilePath(filePath);

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        const allLines = fs.readFileSync(resolvedPath, 'utf8').split('\n');
        startLine = Math.max(0, lineNumber - CONTEXT_LINES - 1);
        endLine = Math.min(allLines.length - 1, lineNumber + CONTEXT_LINES - 1);

        const slicedLines = allLines.slice(startLine, endLine + 1);

        // Add line numbers for the AI to reference
        relevantCode = slicedLines
          .map((line, idx) => {
            const actualLineNum = startLine + idx + 1;
            const marker = actualLineNum === lineNumber ? '>>>' : '   ';
            return `${marker} ${String(actualLineNum).padStart(4, ' ')} | ${line}`;
          })
          .join('\n');

        fileContent = allLines.join('\n');
        console.log(`[CodebaseReader] Read ${slicedLines.length} lines from ${resolvedPath}`);
      } catch (err) {
        console.error(`[CodebaseReader] Could not read file: ${err.message}`);
      }
    } else {
      console.warn(`[CodebaseReader] File not found: ${filePath}`);
    }
  }

  return {
    errorMessage,
    errorType,
    stackTrace,
    filePath: filePath || 'unknown',
    lineNumber: lineNumber || 0,
    relevantCode,
    fileContent,
    startLine,
    endLine,
    hasCode: !!relevantCode,
  };
}

/**
 * Try to resolve relative or absolute file paths.
 * Handles paths like "routes/user.js" or "/app/routes/user.js"
 */
function resolveFilePath(filePath) {
  if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
    return filePath;
  }

  // Try relative to process.cwd()
  const relative = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(relative)) return relative;

  // Try stripping leading slashes and resolving from cwd
  const stripped = path.resolve(process.cwd(), filePath.replace(/^\//, ''));
  if (fs.existsSync(stripped)) return stripped;

  // Try from WATCH_SOURCE_PATH env — check full relative path and basename
  if (process.env.WATCH_SOURCE_PATH) {
    const sourcePath = path.resolve(process.env.WATCH_SOURCE_PATH);
    const fromSourceFull = path.resolve(sourcePath, filePath);
    if (fs.existsSync(fromSourceFull)) return fromSourceFull;
    const fromSourceBase = path.resolve(sourcePath, path.basename(filePath));
    if (fs.existsSync(fromSourceBase)) return fromSourceBase;
  }

  return null;
}

module.exports = { buildContextPackage };
