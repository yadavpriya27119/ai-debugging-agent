/**
 * Feature 4 — Sentry Webhook Integration
 * Receives error events from Sentry and pipes them directly into the pipeline.
 *
 * Setup in Sentry:
 * 1. Project Settings → Integrations → Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/sentry
 * 3. Check "issue" events
 *
 * Also supports generic webhook for any external error source.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { runPipeline } = require('../components/pipeline');

// ---- Sentry Webhook ----
router.post('/sentry', async (req, res) => {
  try {
    // Verify Sentry secret if configured
    if (process.env.SENTRY_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac('sha256', process.env.SENTRY_WEBHOOK_SECRET);
      const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
      const signature = req.headers['sentry-hook-signature'];
      if (digest !== signature) {
        return res.status(401).json({ message: 'Invalid Sentry signature' });
      }
    }

    const { action, data } = req.body;

    // Only process new issues or regressions
    if (!['created', 'triggered'].includes(action)) {
      return res.json({ message: `Ignored action: ${action}` });
    }

    const issue = data?.issue;
    if (!issue) return res.status(400).json({ message: 'No issue data in payload' });

    const errorEvent = parseSentryIssue(issue);
    console.log(`[Webhook/Sentry] Issue received: ${errorEvent.errorType} — ${errorEvent.errorMessage?.substring(0, 80)}`);

    const io = req.app.get('io');
    runPipeline(errorEvent, io).catch(console.error);

    res.json({ message: 'Sentry webhook received. Pipeline triggered.', errorEvent });
  } catch (err) {
    console.error('[Webhook/Sentry] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ---- Generic Webhook (for any tool: Datadog, CloudWatch, custom) ----
router.post('/generic', async (req, res) => {
  try {
    const { errorMessage, errorType, stackTrace, filePath, lineNumber, source } = req.body;

    if (!errorMessage) {
      return res.status(400).json({ message: 'errorMessage is required' });
    }

    const errorEvent = {
      errorMessage,
      errorType: errorType || 'Error',
      stackTrace: stackTrace || '',
      filePath: filePath || null,
      lineNumber: lineNumber ? parseInt(lineNumber) : null,
      rawLogLine: errorMessage,
      source: source || 'generic-webhook',
    };

    console.log(`[Webhook/Generic] Error received from ${source || 'unknown source'}`);

    const io = req.app.get('io');
    runPipeline(errorEvent, io).catch(console.error);

    res.json({ message: 'Webhook received. Pipeline triggered.', errorEvent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Parse Sentry payload into our errorEvent format ----
function parseSentryIssue(issue) {
  const title = issue.title || '';
  const culprit = issue.culprit || '';

  // Extract error type from title (e.g. "TypeError: Cannot read...")
  const typeMatch = title.match(/^(\w+Error|\w+Exception)/);
  const errorType = typeMatch ? typeMatch[1] : 'Error';

  // Extract file + line from culprit (e.g. "routes/user.js in getUser at line 42")
  let filePath = null;
  let lineNumber = null;

  const culpritMatch = culprit.match(/^(.*?)\s+in\s+/);
  if (culpritMatch) filePath = culpritMatch[1];

  const lineMatch = culprit.match(/line\s+(\d+)/i);
  if (lineMatch) lineNumber = parseInt(lineMatch[1]);

  // Build stack trace from Sentry metadata if available
  const stackTrace = issue.metadata?.value
    ? `${title}\n    at ${culprit}`
    : title;

  return {
    errorMessage: title,
    errorType,
    stackTrace,
    filePath,
    lineNumber,
    rawLogLine: title,
    sentryId: issue.id,
    sentryUrl: issue.permalink,
    source: 'sentry',
  };
}

module.exports = router;
