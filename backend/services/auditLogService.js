const AuditLog = require('../models/AuditLog');

const AUDIT_ACTIONS = new Set([
  'customer.create', 'customer.update', 'customer.delete',
  'employee.add', 'employee.update', 'employee.invite', 'employee.accept_invite', 'employee.invite_revoke', 'role.create', 'role.update',
  'module.update', 'appointment.update', 'appointment.delete',
  'business_type.create', 'business_type.update', 'business_module.update',
  'product.create', 'product.update', 'product.archive', 'inventory.movement',
  'supplier.create', 'supplier.update', 'purchase_order.create', 'purchase_order.receive',
  'invoice.create', 'invoice.update', 'invoice.issue', 'invoice.payment',
  'sales_order.create', 'sales_order.confirm', 'sales_order.fulfill', 'sales_order.cancel', 'sales_order.payment',
]);

const AUDIT_ENTITY_TYPES = new Set([
  'customer', 'employee', 'employee_invitation', 'role', 'business_module', 'business_type', 'appointment', 'product', 'inventory_movement', 'supplier', 'purchase_order', 'invoice', 'invoice_payment', 'sales_order', 'sales_order_payment',
]);

const PLATFORM_ACTIONS = new Set([
  'business_type.create', 'business_type.update', 'business_module.update',
]);

const AUDIT_FIELDS = new Set([
  'name', 'email', 'phone', 'status', 'tags', 'notes',
  'cancellationReason', 'roleKey', 'permissions', 'enabledModules', 'roleId',
  'moduleKeys', 'labels', 'icon', 'active', 'sortOrder',
  'sku', 'barcode', 'category', 'priceMinor', 'currency', 'reorderPoint', 'stockOnHand', 'reason',
  'supplierId', 'lines', 'expectedAt', 'unitCostMinor', 'receivedQuantity',
  'invoiceNumber', 'customerId', 'subtotalMinor', 'taxMinor', 'totalMinor', 'paidMinor', 'amountMinor', 'method',
  'actorType', 'channel', 'tableNumber', 'tipRateBps', 'tipMinor', 'paymentMethod', 'paymentStatus', 'reference',
]);

function buildAuditLogRecord(req, event) {
  if (!event || !AUDIT_ACTIONS.has(event.action) || !AUDIT_ENTITY_TYPES.has(event.entityType)) {
    throw new Error('Événement d’audit invalide.');
  }

  const entityId = String(event.entityId || '').trim();
  const scope = event.scope || 'company';
  if (!['company', 'platform'].includes(scope)) {
    throw new Error('Portée d’audit invalide.');
  }
  if (scope === 'platform' && !PLATFORM_ACTIONS.has(event.action)) {
    throw new Error('Action non autorisée dans le journal plateforme.');
  }
  if (scope === 'company' && !event.companyId) {
    throw new Error('Entreprise requise pour un événement d’audit.');
  }
  if (!entityId || entityId.length > 80) {
    throw new Error('Identifiant de ressource invalide pour le journal d’audit.');
  }

  return {
    ...(event.companyId ? { companyId: event.companyId } : {}),
    scope,
    actorId: event.actorId || null,
    actorType: event.actorType || (event.actorId ? 'user' : 'guest'),
    action: event.action,
    entityType: event.entityType,
    entityId,
    changedFields: [...new Set(
      (Array.isArray(event.changedFields) ? event.changedFields : [])
        .map((field) => String(field || '').trim())
        .filter((field) => AUDIT_FIELDS.has(field))
    )],
    ipAddress: String(req?.ip || '').slice(0, 64),
    userAgent: String(req?.get?.('user-agent') || '').slice(0, 256),
  };
}

async function logAuditEvent(req, event) {
  try {
    const record = buildAuditLogRecord(req, event);
    await AuditLog.create(record);
    return true;
  } catch (error) {
    console.error('Audit log write failed:', error?.message || error);
    return false;
  }
}

module.exports = {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  PLATFORM_ACTIONS,
  buildAuditLogRecord,
  logAuditEvent,
};