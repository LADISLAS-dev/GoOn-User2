const mongoose = require('mongoose');

const invoicePaymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 100 },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card_manual', 'mobile_money_manual', 'other'],
      required: true,
    },
    reference: { type: String, default: '', trim: true, maxlength: 100 },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoicePaymentSchema.index({ companyId: 1, idempotencyKey: 1 }, { unique: true });
invoicePaymentSchema.index({ companyId: 1, invoiceId: 1, receivedAt: -1 });

module.exports = mongoose.model('InvoicePayment', invoicePaymentSchema);