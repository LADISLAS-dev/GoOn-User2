const mongoose = require('mongoose');

const deletedAccountSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    emailHash: { type: String, default: '', trim: true, index: true },
    reason: { type: String, default: 'user_request' },
    deletedAt: { type: Date, default: Date.now },
    firebaseDeletedAt: { type: Date, default: null },
    firebaseDeleteAttempts: { type: Number, default: 0 },
    firebaseDeleteLastAttemptAt: { type: Date, default: null },
    firebaseDeleteLastError: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletedAccount', deletedAccountSchema);
