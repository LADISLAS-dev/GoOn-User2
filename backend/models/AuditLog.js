const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    scope: { type: String, enum: ['company', 'platform'], default: 'company', index: true },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorType: { type: String, enum: ['user', 'guest', 'system'], default: 'user' },
    action: {
      type: String,
      enum: [
        'customer.create', 'customer.update', 'customer.delete',
        'employee.add', 'employee.update', 'employee.invite', 'employee.accept_invite', 'employee.invite_revoke', 'role.create', 'role.update',
        'module.update', 'appointment.update', 'appointment.delete',
        'business_type.create', 'business_type.update', 'business_module.update',
        'product.create', 'product.update', 'product.archive', 'inventory.movement',
        'supplier.create', 'supplier.update', 'purchase_order.create', 'purchase_order.receive',
        'invoice.create', 'invoice.update', 'invoice.issue', 'invoice.payment',
        'sales_order.create', 'sales_order.confirm', 'sales_order.fulfill', 'sales_order.cancel', 'sales_order.payment',
      ],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['customer', 'employee', 'employee_invitation', 'role', 'business_module', 'business_type', 'appointment', 'product', 'inventory_movement', 'supplier', 'purchase_order', 'invoice', 'invoice_payment', 'sales_order', 'sales_order_payment'],
      required: true,
    },
    entityId: { type: String, required: true, maxlength: 80 },
    changedFields: { type: [{ type: String, maxlength: 40 }], default: [] },
    ipAddress: { type: String, default: '', maxlength: 64 },
    userAgent: { type: String, default: '', maxlength: 256 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);