/**
 * Component 4 — Fix Generator (The Hands)
 * Writes the AI fix to a temp file, validates syntax, and generates a diff.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const diff = require('diff');

/**
 * Applies an AI-generated fix to a copy of the file.
 * @param {object} contextPackage - from CodebaseReader
 * @param {object} aiResult - from AIBrain
 * @returns {object} { success, tempFilePath, diffOutput, validationPassed }
 */
function applyFix(contextPackage, aiResult) {
  const { filePath, lineNumber, startLine, endLine, fileContent } = contextPackage;
  const { fixedCode } = aiResult;

  if (!fileContent || !fixedCode) {
    return {
      success: false,
      error: 'Missing fileContent or fixedCode',
      diffOutput: '',
      tempFilePath: null,
      validationPassed: false,
    };
  }

  const originalLines = fileContent.split('\n');

  // Replace the relevant block with the AI-fixed code
  const fixedLines = fixedCode.split('\n');
  const newLines = [
    ...originalLines.slice(0, startLine),
    ...fixedLines,
    ...originalLines.slice(endLine + 1),
  ];

  const newContent = newLines.join('\n');

  // Write to a temp file
  const tempDir = path.join(process.cwd(), 'temp_fixes');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const baseName = path.basename(filePath, path.extname(filePath));
  const tempFilePath = path.join(tempDir, `${baseName}_fixed_${Date.now()}${path.extname(filePath)}`);
  fs.writeFileSync(tempFilePath, newContent, 'utf8');

  // Validate syntax with node --check
  let validationPassed = false;
  let validationError = null;
  try {
    execSync(`node --check "${tempFilePath}"`, { stdio: 'pipe' });
    validationPassed = true;
    console.log(`[FixGenerator] Syntax validation passed: ${tempFilePath}`);
  } catch (err) {
    validationError = err.stderr?.toString() || err.message;
    console.warn(`[FixGenerator] Syntax validation failed: ${validationError}`);
  }

  // Generate unified diff
  const diffOutput = diff.createPatch(
    path.basename(filePath),
    fileContent,
    newContent,
    'original',
    'ai-fixed'
  );

  console.log(`[FixGenerator] Fix written to ${tempFilePath}`);

  return {
    success: true,
    tempFilePath,
    newContent,
    diffOutput,
    validationPassed,
    validationError,
  };
}

/**
 * Reads the current content of a file for comparison.
 */
function readOriginalFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

module.exports = { applyFix, readOriginalFile };
