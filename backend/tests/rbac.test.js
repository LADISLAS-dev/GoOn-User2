const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_ROLES,
  PERMISSIONS,
  canAccessCompany,
  canAssignRole,
  hasPermission,
  validateRolePermissions,
} = require('../services/rbacService');

const manager = DEFAULT_ROLES.find((role) => role.key === 'manager');
const staff = DEFAULT_ROLES.find((role) => role.key === 'staff');

test('company owner has implicit access while staff only gets assigned permissions', () => {
  assert.equal(canAccessCompany({ isOwner: true, permission: 'customers:delete' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'customers:read' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'products:read' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'inventory:manage' }), false);
  assert.equal(canAccessCompany({ role: staff, permission: 'customers:delete' }), false);
  assert.equal(canAccessCompany({ role: manager, permission: 'appointments:read' }), true);
  assert.equal(canAccessCompany({ role: manager, permission: 'appointments:manage' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'appointments:read' }), false);
  assert.equal(canAccessCompany({ role: staff, permission: 'appointments:manage' }), false);
  assert.equal(canAccessCompany({ role: manager, permission: 'analytics:read' }), true);
  assert.equal(canAccessCompany({ role: manager, permission: 'purchase_orders:receive' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'purchase_orders:create' }), false);
  assert.equal(canAccessCompany({ role: manager, permission: 'invoices:issue' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'invoices:pay' }), false);
  assert.equal(canAccessCompany({ role: manager, permission: 'orders:manage' }), true);
  assert.equal(canAccessCompany({ role: staff, permission: 'orders:manage' }), false);
  assert.equal(hasPermission(staff, 'team:manage'), false);
});

test('team manager cannot assign a role with permissions they do not have', () => {
  assert.equal(canAssignRole({ actorRole: manager, targetRole: staff }), true);
  assert.equal(canAssignRole({ actorRole: staff, targetRole: manager }), false);
  assert.equal(canAssignRole({ isOwner: true, targetRole: manager }), true);
});

test('role permission lists are normalized and limited to the catalog', () => {
  assert.deepEqual(validateRolePermissions(['customers:read', 'customers:read']), ['customers:read']);
  assert.throws(() => validateRolePermissions(['system:root']));
  assert.equal(PERMISSIONS.some((permission) => permission.key === 'customers:read'), true);
});