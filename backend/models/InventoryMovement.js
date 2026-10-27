const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delta: { type: Number, required: true, validate: Number.isInteger },
    reason: {
      type: String,
      enum: ['opening', 'restock', 'sale', 'return', 'damage', 'adjustment'],
      required: true,
    },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryMovementSchema.index({ companyId: 1, productId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);