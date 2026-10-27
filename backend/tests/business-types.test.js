const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BUSINESS_TYPES,
  collectBusinessTypeModuleKeys,
  normalizeBusinessTypeKey,
  normalizeBusinessTypePayload,
  normalizeBusinessTypeKeys,
} = require('../services/businessTypeService');
const { getDefaultModuleKeys } = require('../services/businessModuleService');

test('business type catalog keeps the legacy category ids stable', () => {
  assert.equal(BUSINESS_TYPES.length, 40);
  assert.equal(BUSINESS_TYPES[0].key, '1');
  assert.equal(BUSINESS_TYPES[39].key, '40');
});

test('business type keys are normalized and deduplicated', () => {
  assert.deepEqual(normalizeBusinessTypeKeys([' 3 ', '3', '', null]), ['3']);
  assert.equal(normalizeBusinessTypeKey(' Custom-Type '), 'custom-type');
  assert.throws(() => normalizeBusinessTypeKey('../admin'));
});

test('business type admin payload requires bilingual labels and unique known-style module keys', () => {
  const payload = normalizeBusinessTypePayload({
    labels: { en: 'Clinic', fr: 'Clinique' },
    icon: '🏥',
    moduleKeys: ['appointments', 'appointments', 'customers'],
    sortOrder: 50,
  });

  assert.deepEqual(payload.moduleKeys, ['appointments', 'customers']);
  assert.equal(payload.active, true);
  assert.throws(() => normalizeBusinessTypePayload({
    labels: { en: 'Clinic' }, icon: '🏥', moduleKeys: [],
  }));
  assert.throws(() => normalizeBusinessTypePayload({
    labels: { en: 'Clinic', fr: 'Clinique' }, icon: '🏥', moduleKeys: [], active: 'false',
  }));
});

test('business type catalog supplies appointment modules by type', () => {
  const keys = collectBusinessTypeModuleKeys(BUSINESS_TYPES.filter((type) => ['2', '27'].includes(type.key)));
  assert.deepEqual(keys, ['appointments', 'inventory', 'invoices', 'sales_orders']);

  const moduleKeys = getDefaultModuleKeys(['2'], undefined, keys);
  assert.equal(moduleKeys.includes('appointments'), true);
  assert.equal(moduleKeys.includes('inventory'), true);
  assert.equal(moduleKeys.includes('invoices'), true);
  assert.equal(moduleKeys.includes('sales_orders'), true);
});

test('retail and warehouse types receive inventory without appointment defaults', () => {
  const keys = collectBusinessTypeModuleKeys(BUSINESS_TYPES.filter((type) => ['15', '19'].includes(type.key)));
  assert.deepEqual(keys, ['inventory', 'invoices', 'sales_orders']);

  const modules = getDefaultModuleKeys(['15'], undefined, keys);
  assert.equal(modules.includes('inventory'), true);
  assert.equal(modules.includes('invoices'), true);
  assert.equal(modules.includes('sales_orders'), true);
  assert.equal(modules.includes('appointments'), false);
  assert.equal(modules.includes('sales_orders'), true);
});

test('commercial and service domains receive the invoice module by default', () => {
  const retail = BUSINESS_TYPES.find((type) => type.key === '15');
  const school = BUSINESS_TYPES.find((type) => type.key === '5');
  assert.equal(retail.moduleKeys.includes('invoices'), true);
  assert.equal(school.moduleKeys.includes('invoices'), false);
});

test('database business type modules override legacy category mappings', () => {
  const moduleKeys = getDefaultModuleKeys(['1'], undefined, ['appointments']);
  assert.equal(moduleKeys.includes('appointments'), true);

  const withoutAppointments = getDefaultModuleKeys(['2'], undefined, []);
  assert.equal(withoutAppointments.includes('appointments'), false);
});