const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetType: {
      type: String,
      enum: ['company', 'service', 'user', 'review'],
      required: true,
    },
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
