const express = require('express');
const router = express.Router();
const ErrorLog = require('../models/ErrorLog');
const Fix = require('../models/Fix');
const { runPipeline } = require('../components/pipeline');

// GET all errors (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [errors, total] = await Promise.all([
      ErrorLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ErrorLog.countDocuments(),
    ]);

    res.json({ errors, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single error with its fix
router.get('/:id', async (req, res) => {
  try {
    const error = await ErrorLog.findById(req.params.id);
    if (!error) return res.status(404).json({ message: 'Not found' });

    const fix = await Fix.findOne({ errorLogId: req.params.id });
    res.json({ error, fix });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST manually trigger pipeline for a test error
router.post('/test', async (req, res) => {
  try {
    const testError = {
      errorMessage: req.body.errorMessage || "TypeError: Cannot read properties of undefined (reading 'name')",
      errorType: req.body.errorType || 'TypeError',
      stackTrace: req.body.stackTrace || 'TypeError: ...\n    at routes/user.js:42:18',
      filePath: req.body.filePath || null,
      lineNumber: req.body.lineNumber || null,
      rawLogLine: req.body.errorMessage || 'Test error',
    };

    // Run pipeline in background
    const io = req.app.get('io');
    runPipeline(testError, io).catch(console.error);

    res.json({ message: 'Pipeline triggered', testError });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET dashboard stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, fixed, failed, analyzing] = await Promise.all([
      ErrorLog.countDocuments(),
      ErrorLog.countDocuments({ status: 'fixed' }),
      ErrorLog.countDocuments({ status: 'failed' }),
      ErrorLog.countDocuments({ status: 'analyzing' }),
    ]);

    const recentErrors = await ErrorLog.find().sort({ createdAt: -1 }).limit(5);
    const avgConfidence = await Fix.aggregate([
      { $group: { _id: null, avg: { $avg: '$confidenceScore' } } },
    ]);

    res.json({
      total,
      fixed,
      failed,
      analyzing,
      successRate: total > 0 ? Math.round((fixed / total) * 100) : 0,
      avgConfidence: avgConfidence[0]?.avg?.toFixed(1) || 0,
      recentErrors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
