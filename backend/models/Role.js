const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    permissions: { type: [{ type: String, trim: true }], default: [] },
    isSystem: { type: Boolean, default: false },
    defaultVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

roleSchema.index({ companyId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);