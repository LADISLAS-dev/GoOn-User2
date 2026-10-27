const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    description: { type: String, required: true, trim: true, maxlength: 180 },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    taxRateBps: { type: Number, default: 0, min: 0, max: 10000 },
    lineSubtotalMinor: { type: Number, required: true, min: 0 },
    lineTaxMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    sourceSalesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, default: '', trim: true, maxlength: 48 },
    status: {
      type: String,
      enum: ['draft', 'issued', 'partially_paid', 'paid', 'void'],
      default: 'draft',
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, default: '', trim: true, maxlength: 40 },
      address: { type: String, default: '', trim: true, maxlength: 300 },
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    lines: { type: [invoiceLineSchema], required: true, validate: (lines) => lines.length > 0 },
    subtotalMinor: { type: Number, required: true, min: 0 },
    taxMinor: { type: Number, required: true, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    paidMinor: { type: Number, default: 0, min: 0 },
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true, maxlength: 1500 },
  },
  { timestamps: true }
);

invoiceSchema.index(
  { companyId: 1, invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { invoiceNumber: { $type: 'string', $gt: '' } } }
);
invoiceSchema.index({ companyId: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ companyId: 1, customerId: 1, createdAt: -1 });
invoiceSchema.index(
  { companyId: 1, sourceSalesOrderId: 1 },
  { unique: true, partialFilterExpression: { sourceSalesOrderId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Invoice', invoiceSchema);