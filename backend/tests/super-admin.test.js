const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isSuperAdmin,
  parseSuperAdminUids,
} = require('../middleware/superAdminMiddleware');

test('super admin access is denied by default', () => {
  assert.equal(isSuperAdmin({ uid: 'user-1' }, new Set()), false);
  assert.equal(isSuperAdmin(null, new Set(['user-1'])), false);
});

test('super admin access accepts an explicitly allowlisted uid', () => {
  assert.equal(isSuperAdmin({ uid: 'admin-1' }, new Set(['admin-1'])), true);
  assert.equal(isSuperAdmin({ uid: 'user-1' }, new Set(['admin-1'])), false);
});

test('super admin access accepts a verified Firebase custom claim', () => {
  assert.equal(isSuperAdmin({ uid: 'admin-1', superAdmin: true }, new Set()), true);
  assert.equal(isSuperAdmin({ uid: 'user-1', superAdmin: 'true' }, new Set()), false);
});

test('allowlist parsing trims and ignores empty uid entries', () => {
  assert.deepEqual([...parseSuperAdminUids(' admin-1, ,admin-2 ')], ['admin-1', 'admin-2']);
});