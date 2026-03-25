/**
 * Pipeline Orchestrator — v2
 * Connects all 5 components + 4 new features:
 *   1. Slack Notifications
 *   2. Confidence-based Auto-Merge (handled inside githubIntegration)
 *   3. Error Pattern Learning (check fix history before calling AI)
 *   4. Sentry Webhook (handled in routes/webhooks.js, feeds into this pipeline)
 */

const ErrorLog = require('../models/ErrorLog');
const Fix = require('../models/Fix');
const { buildContextPackage } = require('./codebaseReader');
const { analyzeAndFix } = require('./aiBrain');
const { applyFix } = require('./fixGenerator');
const { createFixPR } = require('./githubIntegration');
const { findProvenFix } = require('./patternLearner');
const { notifyErrorDetected, notifyPROpened, notifyPipelineFailed } = require('./slackNotifier');

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT = 2;

let activeJobs = 0;

/**
 * Main pipeline: takes a raw error event and runs it through all components.
 * @param {object} errorEvent - from LogWatcher, Sentry webhook, or manual trigger
 * @param {object} io - socket.io instance for real-time dashboard updates
 */
async function runPipeline(errorEvent, io) {
  if (activeJobs >= MAX_CONCURRENT) {
    console.log('[Pipeline] Too many active jobs. Skipping.');
    return;
  }

  activeJobs++;

  try {
    // ── Step 1: Deduplication check ──────────────────────────────────────
    const recentDuplicate = await ErrorLog.findOne({
      errorMessage: errorEvent.errorMessage,
      filePath: errorEvent.filePath,
      lineNumber: errorEvent.lineNumber,
      updatedAt: { $gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
    });

    if (recentDuplicate) {
      console.log('[Pipeline] Duplicate error within window — incrementing count.');
      await ErrorLog.findByIdAndUpdate(recentDuplicate._id, {
        $inc: { occurrenceCount: 1 },
        lastSeen: new Date(),
      });
      emit(io, 'duplicate_error', { errorId: recentDuplicate._id });
      return;
    }

    // ── Step 2: Save error to DB ──────────────────────────────────────────
    const errorLog = await ErrorLog.create({
      errorMessage: errorEvent.errorMessage,
      errorType: errorEvent.errorType,
      stackTrace: errorEvent.stackTrace,
      filePath: errorEvent.filePath,
      lineNumber: errorEvent.lineNumber,
      rawLogLine: errorEvent.rawLogLine,
      status: 'analyzing',
    });

    emit(io, 'error_detected', { error: errorLog });

    // ── Feature 1: Slack — notify error detected ──────────────────────────
    await notifyErrorDetected({
      errorType: errorEvent.errorType,
      errorMessage: errorEvent.errorMessage,
      filePath: errorEvent.filePath,
      lineNumber: errorEvent.lineNumber,
    });

    console.log(`[Pipeline] Error saved: ${errorLog._id}`);

    // ── Step 3: Read the broken code ──────────────────────────────────────
    const contextPackage = buildContextPackage(errorEvent);
    if (!contextPackage.hasCode) {
      console.warn('[Pipeline] Could not read source file. Continuing with AI only...');
    }

    // ── Feature 3: Pattern Learning — check fix history first ─────────────
    let aiResult;
    const provenFix = await findProvenFix(errorEvent);

    if (provenFix) {
      console.log(`[Pipeline] Using proven fix from history (source: ${provenFix.source}, ${provenFix.timesFixed}x fixed)`);
      const historicFix = provenFix.fix;
      aiResult = {
        fixedCode: historicFix.fixedCode,
        explanation: `[Learned Fix — used ${provenFix.timesFixed} times]\n${historicFix.aiExplanation}`,
        confidenceScore: Math.min(historicFix.confidenceScore + 5, 99), // slight boost for proven fix
        errorCategory: 'learned',
        fromHistory: true,
      };
      emit(io, 'pattern_match', { errorId: errorLog._id, timesFixed: provenFix.timesFixed });
    } else {
      // ── Step 4: Ask AI to fix it ────────────────────────────────────────
      try {
        aiResult = await analyzeAndFix(contextPackage);
        console.log(`[Pipeline] AI fix generated. Confidence: ${aiResult.confidenceScore}%`);
      } catch (err) {
        console.error(`[Pipeline] AI Brain failed: ${err.message}`);
        await ErrorLog.findByIdAndUpdate(errorLog._id, { status: 'failed' });
        emit(io, 'pipeline_failed', { errorId: errorLog._id, reason: err.message });
        await notifyPipelineFailed({
          errorType: errorEvent.errorType,
          errorMessage: errorEvent.errorMessage,
          reason: err.message,
        });
        return;
      }
    }

    // ── Step 5: Generate the fix file ─────────────────────────────────────
    const fixResult = applyFix(contextPackage, aiResult);

    // Save fix to DB
    const fix = await Fix.create({
      errorLogId: errorLog._id,
      originalCode: contextPackage.relevantCode,
      fixedCode: aiResult.fixedCode,
      diffOutput: fixResult.diffOutput,
      aiExplanation: aiResult.explanation,
      confidenceScore: aiResult.confidenceScore,
      aiModel: aiResult.fromHistory ? 'pattern-cache' : 'llama-3.3-70b-versatile',
      status: 'pending',
    });

    emit(io, 'fix_generated', { fix, error: errorLog });

    // ── Step 6: Open GitHub PR ────────────────────────────────────────────
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        const prResult = await createFixPR({
          contextPackage,
          aiResult,
          fixResult,
          errorLogId: errorLog._id,
        });

        await Fix.findByIdAndUpdate(fix._id, {
          githubPrUrl: prResult.prUrl,
          githubPrNumber: prResult.prNumber,
          githubBranch: prResult.branchName,
          status: prResult.autoMerged ? 'merged' : 'pr_opened',
        });

        await ErrorLog.findByIdAndUpdate(errorLog._id, { status: 'fixed' });

        // ── Feature 1: Slack — notify PR opened / auto-merged ─────────────
        await notifyPROpened({
          errorType: errorEvent.errorType,
          filePath: errorEvent.filePath,
          confidenceScore: aiResult.confidenceScore,
          prUrl: prResult.prUrl,
          prNumber: prResult.prNumber,
          explanation: aiResult.explanation,
          autoMerged: prResult.autoMerged,
        });

        emit(io, 'pr_opened', {
          errorId: errorLog._id,
          fixId: fix._id,
          prUrl: prResult.prUrl,
          prNumber: prResult.prNumber,
          autoMerged: prResult.autoMerged,
        });

        const status = prResult.autoMerged ? 'AUTO-MERGED' : 'PR opened';
        console.log(`[Pipeline] Complete! ${status}: ${prResult.prUrl}`);
      } catch (err) {
        console.error(`[Pipeline] GitHub PR failed: ${err.message}`);
        await ErrorLog.findByIdAndUpdate(errorLog._id, { status: 'fixed' });
        emit(io, 'pr_failed', { errorId: errorLog._id, reason: err.message });
        await notifyPipelineFailed({
          errorType: errorEvent.errorType,
          errorMessage: errorEvent.errorMessage,
          reason: `GitHub PR failed: ${err.message}`,
        });
      }
    } else {
      await ErrorLog.findByIdAndUpdate(errorLog._id, { status: 'fixed' });
      console.log('[Pipeline] GitHub not configured. Fix saved locally only.');
    }
  } catch (err) {
    console.error(`[Pipeline] Unexpected error: ${err.message}`);
  } finally {
    activeJobs--;
  }
}

function emit(io, event, data) {
  if (io) io.emit(event, data);
}

module.exports = { runPipeline };
