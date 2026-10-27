const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 64 },
    barcode: { type: String, default: '', trim: true, maxlength: 64 },
    category: { type: String, default: '', trim: true, maxlength: 80 },
    priceMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    stockOnHand: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

productSchema.index({ companyId: 1, sku: 1 }, { unique: true });
productSchema.index({ companyId: 1, status: 1, updatedAt: -1 });
productSchema.index({ companyId: 1, stockOnHand: 1, reorderPoint: 1 });

module.exports = mongoose.model('Product', productSchema);