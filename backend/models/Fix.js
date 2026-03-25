const mongoose = require('mongoose');

const fixSchema = new mongoose.Schema(
  {
    errorLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ErrorLog',
      required: true,
    },
    originalCode: { type: String },
    fixedCode: { type: String },
    diffOutput: { type: String },
    aiExplanation: { type: String },
    confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
    aiModel: { type: String, default: 'llama-3.3-70b-versatile' },
    githubPrUrl: { type: String },
    githubPrNumber: { type: Number },
    githubBranch: { type: String },
    status: {
      type: String,
      enum: ['pending', 'applied', 'pr_opened', 'merged', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fix', fixSchema);
