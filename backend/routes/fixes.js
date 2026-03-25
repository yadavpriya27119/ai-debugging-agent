const express = require('express');
const router = express.Router();
const Fix = require('../models/Fix');

// GET all fixes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [fixes, total] = await Promise.all([
      Fix.find().populate('errorLogId').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Fix.countDocuments(),
    ]);

    res.json({ fixes, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single fix
router.get('/:id', async (req, res) => {
  try {
    const fix = await Fix.findById(req.params.id).populate('errorLogId');
    if (!fix) return res.status(404).json({ message: 'Not found' });
    res.json(fix);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
