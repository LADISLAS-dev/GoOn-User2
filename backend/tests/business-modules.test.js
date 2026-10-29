const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BUSINESS_MODULES,
  buildCompanyModuleAssignments,
  buildDefaultModuleAssignments,
  getCategoryRequiredModuleKeys,
  getCompanyModuleKeys,
  getDefaultModuleKeys,
} = require('../services/businessModuleService');
const Company = require('../models/company');

test('default modules include booking for appointment-oriented categories', () => {
  const modules = getDefaultModuleKeys(['3']);

  assert.deepEqual(modules, ['company', 'appointments', 'messages', 'business_info', 'team', 'audit_logs']);
});

test('default modules omit booking for categories without a booking template', () => {
  const modules = getDefaultModuleKeys(['1']);

  assert.deepEqual(modules, ['company', 'messages', 'business_info', 'team', 'audit_logs']);
});

test('legacy companies derive modules from their existing categories', () => {
  const modules = getCompanyModuleKeys({ categoryId: '9' });

  assert.deepEqual(modules, ['company', 'appointments', 'messages', 'business_info', 'team', 'audit_logs']);
});

test('companies without saved module choices keep the legacy fallback', () => {
  const company = new Company({ name: 'Legacy company', ownerId: '507f1f77bcf86cd799439011' });

  assert.equal(company.enabledModules, undefined);
});

test('explicit company configuration takes precedence over defaults', () => {
  const modules = getCompanyModuleKeys({
    categoryIds: ['3'],
    enabledModules: [
      { key: 'company' },
      { key: 'appointments', enabled: false },
      { key: 'messages', enabled: false },
    ],
  });

  assert.deepEqual(modules, ['company', 'business_info', 'team', 'audit_logs']);
});

test('product catalog modules stay enabled even when an old company disabled them', () => {
  const company = {
    categoryIds: ['12'],
    enabledModules: [{ key: 'inventory', enabled: false }, { key: 'sales_orders', enabled: false }],
  };
  const modules = getCompanyModuleKeys(company);

  assert.equal(getCategoryRequiredModuleKeys(company).has('inventory'), true);
  assert.equal(getCategoryRequiredModuleKeys(company).has('sales_orders'), true);
  assert.equal(modules.includes('inventory'), true);
  assert.equal(modules.includes('sales_orders'), true);
  assert.equal(getCategoryRequiredModuleKeys({ categoryId: '2' }).has('inventory'), true);
});

test('default assignments store stable module keys', () => {
  const assignments = buildDefaultModuleAssignments(['1'], BUSINESS_MODULES);

  assert.deepEqual(assignments, [
    { key: 'company', enabled: true },
    { key: 'messages', enabled: true },
    { key: 'business_info', enabled: true },
    { key: 'team', enabled: true },
    { key: 'audit_logs', enabled: true },
  ]);
});

test('mandatory modules cannot be disabled by company settings', () => {
  const result = buildCompanyModuleAssignments([
    { key: 'company', enabled: false },
    { key: 'appointments', enabled: true },
  ]);

  assert.deepEqual(result.unknownKeys, []);
  assert.equal(result.assignments.find((module) => module.key === 'company').enabled, true);
  assert.equal(result.assignments.find((module) => module.key === 'business_info').enabled, true);
  assert.equal(result.assignments.find((module) => module.key === 'appointments').enabled, true);
  assert.equal(result.assignments.find((module) => module.key === 'messages').enabled, false);
});

test('module settings reject keys outside the active catalog', () => {
  const result = buildCompanyModuleAssignments([{ key: 'future_pos', enabled: true }]);

  assert.deepEqual(result.unknownKeys, ['future_pos']);
  assert.equal(result.assignments.find((module) => module.key === 'company').enabled, true);
  assert.equal(result.assignments.find((module) => module.key === 'business_info').enabled, true);
});

test('analytics module stays disabled by default', () => {
  const modules = getDefaultModuleKeys(['3']);

  assert.equal(modules.includes('analytics'), false);
});

test('procurement stays optional until an administrator or owner enables it', () => {
  const modules = getDefaultModuleKeys(['15']);
  assert.equal(modules.includes('procurement'), false);

  const result = buildCompanyModuleAssignments([{ key: 'procurement', enabled: true }]);
  assert.equal(result.unknownKeys.length, 0);
  assert.equal(result.assignments.find((module) => module.key === 'procurement').enabled, true);
});

test('company can explicitly enable the analytics module', () => {
  const result = buildCompanyModuleAssignments([{ key: 'analytics', enabled: true }]);

  assert.deepEqual(result.unknownKeys, []);
  assert.equal(result.assignments.some((module) => module.key === 'analytics'), true);
});