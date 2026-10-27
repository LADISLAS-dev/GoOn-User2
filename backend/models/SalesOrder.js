const mongoose = require('mongoose');

const salesOrderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, trim: true, maxlength: 64 },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const salesOrderSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    orderNumber: { type: String, required: true, trim: true, maxlength: 48 },
    status: { type: String, enum: ['draft', 'confirmed', 'fulfilled', 'cancelled'], default: 'draft', index: true },
    channel: { type: String, enum: ['pro', 'restaurant_app'], default: 'pro', index: true },
    tableNumber: { type: String, default: '', trim: true, maxlength: 24 },
    tipRateBps: { type: Number, default: 0, min: 0, max: 1500 },
    tipMinor: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: ['pay_at_venue', 'stripe', 'paypal'], default: 'pay_at_venue' },
    paymentStatus: { type: String, enum: ['unpaid', 'authorized', 'partially_paid', 'paid', 'failed', 'voided'], default: 'unpaid', index: true },
    paidMinor: { type: Number, default: 0, min: 0 },
    stripeCheckoutSessionId: { type: String, default: '', trim: true },
    stripePaymentIntentId: { type: String, default: '', trim: true },
    paypalOrderId: { type: String, default: '', trim: true },
    paypalAuthorizationId: { type: String, default: '', trim: true },
    customer: {
      name: { type: String, default: '', trim: true, maxlength: 120 },
      email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, default: '', trim: true, maxlength: 40 },
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    lines: { type: [salesOrderLineSchema], required: true, validate: (lines) => lines.length > 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    confirmedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

salesOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);