const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 40 },
    currency: { type: String, default: 'XOF', uppercase: true, minlength: 3, maxlength: 3 },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

supplierSchema.index({ companyId: 1, name: 1 }, { unique: true });
supplierSchema.index({ companyId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);