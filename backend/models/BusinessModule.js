const mongoose = require('mongoose');

const businessModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    labels: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
      es: { type: String, required: true },
      pt: { type: String, required: true },
    },
    icon: { type: String, required: true },
    screen: {
      type: String,
      enum: ['CompanyHome', 'Booking', 'Messages', 'About', 'Analytics', 'Customers', 'Team', 'AuditLogs', 'Inventory', 'Procurement', 'Invoices', 'SalesOrders'],
      required: true,
    },
    requiredPermission: { type: String, default: '' },
    requiredPermissions: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    defaultEnabled: { type: Boolean, default: true },
    mandatory: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessModule', businessModuleSchema);