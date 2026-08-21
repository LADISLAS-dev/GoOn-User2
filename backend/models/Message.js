const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentName: {
      type: String,
      default: null,
    },
    attachmentMime: {
      type: String,
      default: null,
    },
    attachmentSize: {
      type: Number,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function ensureMessageContent(next) {
  const hasText = typeof this.text === 'string' && this.text.trim().length > 0;
  const hasAttachment = typeof this.attachmentUrl === 'string' && this.attachmentUrl.trim().length > 0;

  if (!hasText && !hasAttachment) {
    return next(new Error('Message must include text or an attachment'));
  }

  return next();
});

module.exports = mongoose.model('Message', messageSchema);