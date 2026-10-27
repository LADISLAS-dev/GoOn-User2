const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: ['lead', 'active', 'inactive'],
      default: 'active',
      index: true,
    },
    tags: { type: [{ type: String, trim: true, maxlength: 32 }], default: [] },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

customerSchema.index({ companyId: 1, updatedAt: -1 });
customerSchema.index({ companyId: 1, email: 1 });

module.exports = mongoose.model('Customer', customerSchema);