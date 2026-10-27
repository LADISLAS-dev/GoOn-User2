const mongoose = require('mongoose');

const teamInvitationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

teamInvitationSchema.index({ companyId: 1, email: 1, status: 1 });
teamInvitationSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('TeamInvitation', teamInvitationSchema);