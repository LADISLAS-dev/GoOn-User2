const mongoose = require('mongoose');

const purchaseOrderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true, maxlength: 64 },
    productName: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCostMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: String, required: true, trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: ['ordered', 'partially_received', 'received', 'cancelled'],
      default: 'ordered',
      index: true,
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    lines: { type: [purchaseOrderLineSchema], required: true, validate: (lines) => lines.length > 0 },
    expectedAt: { type: Date, default: null },
    orderedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    receiptKeys: { type: [String], default: [] },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });
purchaseOrderSchema.index({ companyId: 1, supplierId: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);