/**
 * Feature 3 — Error Pattern Learning (The Memory)
 * Before calling the AI, checks if this exact error has been fixed before.
 * If a proven fix exists (merged PR, high confidence), reuses it directly.
 * This saves AI API calls and gives faster, more reliable fixes over time.
 */

const ErrorLog = require('../models/ErrorLog');
const Fix = require('../models/Fix');

const SIMILARITY_THRESHOLD = 0.85; // 85% similar = treat as same error
const MIN_OCCURRENCES_TO_TRUST = 2; // Must have been fixed at least 2 times

/**
 * Check if a proven fix already exists for this error.
 * @param {object} errorEvent
 * @returns {object|null} proven fix or null
 */
async function findProvenFix(errorEvent) {
  const { errorMessage, errorType, filePath, lineNumber } = errorEvent;

  try {
    // Look for past fixes on same file + line (exact match)
    if (filePath && lineNumber) {
      const exactMatch = await Fix.findOne({
        status: { $in: ['pr_opened', 'merged'] },
        'errorLogId.filePath': filePath,
        'errorLogId.lineNumber': lineNumber,
      })
        .populate('errorLogId')
        .sort({ confidenceScore: -1 });

      if (exactMatch && exactMatch.confidenceScore >= 80) {
        console.log(`[PatternLearner] Exact match found! Fix from ${exactMatch.createdAt.toDateString()}`);
        return {
          source: 'exact_match',
          fix: exactMatch,
          timesFixed: await countFixesForLocation(filePath, lineNumber),
        };
      }
    }

    // Look for fuzzy match by error type + similar message
    const similarFixes = await Fix.find({
      status: { $in: ['pr_opened', 'merged'] },
      confidenceScore: { $gte: 75 },
    })
      .populate('errorLogId')
      .sort({ confidenceScore: -1 })
      .limit(20);

    for (const fix of similarFixes) {
      if (!fix.errorLogId) continue;
      const similarity = computeSimilarity(errorMessage, fix.errorLogId.errorMessage);

      if (
        similarity >= SIMILARITY_THRESHOLD &&
        fix.errorLogId.errorType === errorType
      ) {
        const timesFixed = await countFixesForMessage(fix.errorLogId.errorMessage, errorType);

        if (timesFixed >= MIN_OCCURRENCES_TO_TRUST) {
          console.log(`[PatternLearner] Similar pattern found (${Math.round(similarity * 100)}% match, fixed ${timesFixed}x)`);
          return {
            source: 'pattern_match',
            similarity: Math.round(similarity * 100),
            timesFixed,
            fix,
          };
        }
      }
    }

    console.log('[PatternLearner] No proven fix found — will call AI.');
    return null;
  } catch (err) {
    console.error('[PatternLearner] Error during pattern lookup:', err.message);
    return null;
  }
}

/**
 * Mark a fix as successful (called when PR is merged).
 * This is what "teaches" the agent over time.
 */
async function markFixAsSuccessful(fixId) {
  try {
    await Fix.findByIdAndUpdate(fixId, { status: 'merged' });
    console.log(`[PatternLearner] Fix ${fixId} marked as successful/merged.`);
  } catch (err) {
    console.error('[PatternLearner] Could not mark fix:', err.message);
  }
}

/**
 * Get learning stats — how many errors were solved from pattern vs AI
 */
async function getLearningStats() {
  const [total, fromPattern, fromAI, merged] = await Promise.all([
    Fix.countDocuments(),
    Fix.countDocuments({ 'meta.source': 'pattern_match' }),
    Fix.countDocuments({ 'meta.source': { $ne: 'pattern_match' } }),
    Fix.countDocuments({ status: 'merged' }),
  ]);

  return { total, fromPattern, fromAI, merged, patternHitRate: total > 0 ? Math.round((fromPattern / total) * 100) : 0 };
}

// ---- Helpers ----

async function countFixesForLocation(filePath, lineNumber) {
  const errors = await ErrorLog.find({ filePath, lineNumber });
  const ids = errors.map((e) => e._id);
  return Fix.countDocuments({ errorLogId: { $in: ids }, status: { $in: ['pr_opened', 'merged'] } });
}

async function countFixesForMessage(errorMessage, errorType) {
  const errors = await ErrorLog.find({ errorType });
  let count = 0;
  for (const e of errors) {
    if (computeSimilarity(e.errorMessage, errorMessage) >= SIMILARITY_THRESHOLD) count++;
  }
  return count;
}

/**
 * Simple similarity score between two strings (Dice coefficient)
 */
function computeSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  let intersection = 0;
  const used = new Array(bigrams2.length).fill(false);

  for (const bg of bigrams1) {
    const idx = bigrams2.findIndex((b, i) => !used[i] && b === bg);
    if (idx !== -1) {
      intersection++;
      used[idx] = true;
    }
  }

  return (2 * intersection) / (bigrams1.length + bigrams2.length);
}

function getBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

module.exports = { findProvenFix, markFixAsSuccessful, getLearningStats };
