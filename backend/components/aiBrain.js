/**
 * Component 3 — AI Brain (The Thinking)
 * Uses Groq API (FREE) with Llama 3 to analyze errors and generate fixes.
 * Groq is free at: https://console.groq.com
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Free on Groq

/**
 * Analyzes an error context package and returns a fix.
 * @param {object} contextPackage - from CodebaseReader
 * @returns {object} { fixedCode, explanation, confidenceScore }
 */
async function analyzeAndFix(contextPackage) {
  const { errorMessage, errorType, stackTrace, filePath, lineNumber, relevantCode, fileContent } = contextPackage;

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in .env');
  }

  const prompt = buildPrompt({ errorMessage, errorType, stackTrace, filePath, lineNumber, relevantCode });

  console.log(`[AIBrain] Sending to Groq (${MODEL})...`);

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert Node.js / JavaScript debugging assistant. 
Your job is to:
1. Analyze the error and the code provided
2. Identify the exact bug
3. Return ONLY the corrected version of the shown code block
4. Provide a brief plain-English explanation

Always respond in this exact JSON format:
{
  "fixedCode": "<the corrected code block — same scope as shown, no extra wrapping>",
  "explanation": "<plain English: what was wrong and what you changed>",
  "confidenceScore": <integer 0-100>,
  "errorCategory": "<one of: null_reference, undefined_variable, missing_import, wrong_type, async_error, syntax_error, logic_error, other>"
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const rawContent = response.data.choices[0].message.content;
  console.log(`[AIBrain] Response received. Tokens used: ${response.data.usage?.total_tokens}`);

  return parseAIResponse(rawContent, fileContent, contextPackage);
}

function buildPrompt({ errorMessage, errorType, stackTrace, filePath, lineNumber, relevantCode }) {
  return `## Error Detected in Production

**Error Type:** ${errorType}
**Error Message:** ${errorMessage}
**File:** ${filePath}
**Line:** ${lineNumber}

## Stack Trace
\`\`\`
${stackTrace || 'Not available'}
\`\`\`

## Relevant Code (line ${lineNumber} is marked with >>>)
\`\`\`javascript
${relevantCode || 'Code could not be read — infer fix from error message and stack trace only.'}
\`\`\`

## Your Task
1. Identify the bug on or near line ${lineNumber}
2. Return the fixed version of the code block shown above
3. Explain what was wrong in plain English
4. Give a confidence score (0–100) for how sure you are this fix is correct

Respond ONLY with valid JSON as described in the system prompt.`;
}

function parseAIResponse(rawContent, fileContent, contextPackage) {
  try {
    // Strip markdown code fences if present
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      fixedCode: parsed.fixedCode || '',
      explanation: parsed.explanation || 'No explanation provided.',
      confidenceScore: parseInt(parsed.confidenceScore, 10) || 50,
      errorCategory: parsed.errorCategory || 'other',
      rawResponse: rawContent,
    };
  } catch {
    console.warn('[AIBrain] Could not parse JSON response. Extracting manually...');

    // Fallback: try to extract code block from markdown
    const codeMatch = rawContent.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    const fixedCode = codeMatch ? codeMatch[1] : '';

    return {
      fixedCode,
      explanation: rawContent.substring(0, 500),
      confidenceScore: 40,
      errorCategory: 'other',
      rawResponse: rawContent,
    };
  }
}

module.exports = { analyzeAndFix };
