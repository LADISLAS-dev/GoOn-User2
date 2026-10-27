const mongoose = require('mongoose');

const salesOrderPaymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 100 },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    method: { type: String, enum: ['cash', 'bank_transfer', 'card_manual', 'mobile_money_manual', 'other', 'stripe', 'paypal'], required: true },
    reference: { type: String, default: '', trim: true, maxlength: 100 },
    status: { type: String, enum: ['captured', 'refunded'], default: 'captured', index: true },
    providerTransactionId: { type: String, default: '', trim: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

salesOrderPaymentSchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
salesOrderPaymentSchema.index({ companyId: 1, salesOrderId: 1, receivedAt: -1 });

module.exports = mongoose.model('SalesOrderPayment', salesOrderPaymentSchema);