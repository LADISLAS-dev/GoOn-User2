const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAuditLogRecord } = require('../services/auditLogService');

test('audit record contains changed field names but no personal values', () => {
  const req = {
    ip: '192.0.2.10',
    get: (name) => name === 'user-agent' ? 'GoOn Test Client' : '',
  };
  const record = buildAuditLogRecord(req, {
    companyId: 'company-id',
    actorId: 'actor-id',
    action: 'customer.update',
    entityType: 'customer',
    entityId: 'customer-id',
    changedFields: ['email', 'notes', 'password', 'email'],
    values: { email: 'private@example.com' },
  });

  assert.deepEqual(record.changedFields, ['email', 'notes']);
  assert.equal(JSON.stringify(record).includes('private@example.com'), false);
  assert.equal(record.ipAddress, '192.0.2.10');
});

test('audit record rejects unsupported actions and missing entity ids', () => {
  assert.throws(() => buildAuditLogRecord({}, {
    action: 'system.root', entityType: 'customer', entityId: 'id',
  }));
  assert.throws(() => buildAuditLogRecord({}, {
    action: 'customer.delete', entityType: 'customer', entityId: '',
  }));
});

test('platform audit events do not require a company id', () => {
  const record = buildAuditLogRecord({}, {
    scope: 'platform',
    actorId: 'admin-id',
    action: 'business_type.create',
    entityType: 'business_type',
    entityId: 'clinic',
    changedFields: ['name', 'moduleKeys'],
  });

  assert.equal(record.scope, 'platform');
  assert.equal(record.companyId, undefined);
  assert.deepEqual(record.changedFields, ['name', 'moduleKeys']);
  assert.throws(() => buildAuditLogRecord({}, {
    scope: 'platform',
    actorId: 'admin-id',
    action: 'customer.update',
    entityType: 'customer',
    entityId: 'customer-id',
  }));
});

test('public guest order audit events can be recorded without a user id', () => {
  const record = buildAuditLogRecord({}, {
    companyId: 'company-id',
    actorType: 'guest',
    action: 'sales_order.create',
    entityType: 'sales_order',
    entityId: 'order-id',
    changedFields: ['customer', 'lines', 'totalMinor', 'tableNumber'],
  });

  assert.equal(record.actorId, null);
  assert.equal(record.actorType, 'guest');
});