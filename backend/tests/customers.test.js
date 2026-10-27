const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCustomerFilter,
  normalizeCustomerInput,
  normalizePagination,
} = require('../services/customerService');

test('customer input is trimmed and email is normalized', () => {
  const customer = normalizeCustomerInput({
    name: '  Amina Diallo  ',
    email: '  AMINA@example.com ',
    phone: ' +221 77 000 00 00 ',
    tags: ['VIP', ' VIP ', 'new'],
  });

  assert.equal(customer.name, 'Amina Diallo');
  assert.equal(customer.email, 'amina@example.com');
  assert.equal(customer.phone, '+221 77 000 00 00');
  assert.deepEqual(customer.tags, ['VIP', 'new']);
  assert.equal(customer.status, 'active');
});

test('customer input rejects empty names, invalid emails and statuses', () => {
  assert.throws(() => normalizeCustomerInput({ name: '  ' }));
  assert.throws(() => normalizeCustomerInput({ name: 'Amina', email: 'bad email' }));
  assert.throws(() => normalizeCustomerInput({ name: 'Amina', status: 'admin' }));
});

test('partial customer updates validate only supplied fields', () => {
  assert.deepEqual(normalizeCustomerInput({ notes: ' Call next week ' }, { partial: true }), {
    notes: 'Call next week',
  });
  assert.throws(() => normalizeCustomerInput({ email: 'bad' }, { partial: true }));
});

test('search terms are escaped and scoped to one company', () => {
  const filter = buildCustomerFilter({ companyId: 'company-id', search: 'a.*[b', status: 'lead' });

  assert.equal(filter.companyId, 'company-id');
  assert.equal(filter.status, 'lead');
  assert.equal(filter.$or[0].name.source, 'a\\.\\*\\[b');
  assert.equal(filter.$or[0].name.test('a.*[b'), true);
  assert.equal(filter.$or[0].name.test('axxxb'), false);
});

test('pagination uses safe defaults and caps page size', () => {
  assert.deepEqual(normalizePagination('invalid', '10000'), { page: 1, limit: 100 });
  assert.deepEqual(normalizePagination('-4', '0'), { page: 1, limit: 1 });
});