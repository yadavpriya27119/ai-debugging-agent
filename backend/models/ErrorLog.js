const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
  {
    errorMessage: { type: String, required: true },
    errorType: { type: String, default: 'Unknown' },
    stackTrace: { type: String },
    filePath: { type: String },
    lineNumber: { type: Number },
    rawLogLine: { type: String },
    status: {
      type: String,
      enum: ['detected', 'analyzing', 'fixed', 'failed', 'duplicate'],
      default: 'detected',
    },
    occurrenceCount: { type: Number, default: 1 },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for deduplication — same error in same file at same line
errorLogSchema.index({ errorMessage: 1, filePath: 1, lineNumber: 1 });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
