const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { getLearningStats } = require('../components/patternLearner');

// Default settings shipped with the app
const DEFAULTS = {
  slack_webhook_url: { value: '', label: 'Slack Webhook URL', group: 'notifications' },
  slack_enabled: { value: false, label: 'Enable Slack Notifications', group: 'notifications' },
  auto_merge_enabled: { value: true, label: 'Enable Auto-Merge', group: 'github' },
  auto_merge_threshold: { value: 95, label: 'Auto-Merge Confidence Threshold (%)', group: 'github' },
  github_owner: { value: process.env.GITHUB_OWNER || '', label: 'GitHub Owner', group: 'github' },
  github_repo: { value: process.env.GITHUB_REPO || '', label: 'GitHub Repo', group: 'github' },
  pattern_learning_enabled: { value: true, label: 'Enable Pattern Learning', group: 'ai' },
  min_confidence_to_pr: { value: 40, label: 'Minimum Confidence to Open PR (%)', group: 'ai' },
  watch_log_path: { value: process.env.WATCH_LOG_PATH || '', label: 'Log File Path to Watch', group: 'monitoring' },
};

// GET all settings
router.get('/', async (req, res) => {
  try {
    const saved = await Settings.find();
    const savedMap = {};
    saved.forEach((s) => { savedMap[s.key] = s.value; });

    // Merge defaults with saved values
    const result = {};
    for (const [key, meta] of Object.entries(DEFAULTS)) {
      result[key] = {
        value: savedMap[key] !== undefined ? savedMap[key] : meta.value,
        label: meta.label,
        group: meta.group,
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update one or many settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body; // { key: value, key2: value2 }

    const ops = Object.entries(updates).map(([key, value]) =>
      Settings.findOneAndUpdate(
        { key },
        { key, value, label: DEFAULTS[key]?.label, group: DEFAULTS[key]?.group },
        { upsert: true, new: true }
      )
    );

    await Promise.all(ops);

    // Apply runtime changes that don't need restart
    if (updates.auto_merge_threshold !== undefined) {
      process.env.AUTO_MERGE_THRESHOLD = String(updates.auto_merge_threshold);
    }
    if (updates.github_owner !== undefined) process.env.GITHUB_OWNER = updates.github_owner;
    if (updates.github_repo !== undefined) process.env.GITHUB_REPO = updates.github_repo;
    if (updates.slack_webhook_url !== undefined) process.env.SLACK_WEBHOOK_URL = updates.slack_webhook_url;

    res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET pattern learning stats
router.get('/learning-stats', async (req, res) => {
  try {
    const stats = await getLearningStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET webhook info
router.get('/webhooks', (req, res) => {
  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  res.json({
    sentry: {
      url: `${base}/api/webhooks/sentry`,
      method: 'POST',
      description: 'Connect from Sentry: Project Settings → Integrations → Webhooks',
      headers: { 'Content-Type': 'application/json' },
    },
    generic: {
      url: `${base}/api/webhooks/generic`,
      method: 'POST',
      description: 'Use from any tool: Datadog, CloudWatch, custom scripts',
      body: {
        errorMessage: 'string (required)',
        errorType: 'string',
        stackTrace: 'string',
        filePath: 'string',
        lineNumber: 'number',
        source: 'string',
      },
    },
  });
});

module.exports = router;
