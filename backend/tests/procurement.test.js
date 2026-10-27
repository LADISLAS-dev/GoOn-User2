const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getPurchaseOrderStatus,
  normalizePurchaseOrderInput,
  normalizeReceiptLines,
  normalizeSupplierInput,
} = require('../services/procurementService');

test('supplier input normalizes email, currency and contact fields', () => {
  const supplier = normalizeSupplierInput({
    name: ' Parts Co ',
    email: ' ORDERS@PARTS.EXAMPLE ',
    currency: 'xof',
  });
  assert.equal(supplier.name, 'Parts Co');
  assert.equal(supplier.email, 'orders@parts.example');
  assert.equal(supplier.currency, 'XOF');
});

test('purchase order validates lines and calculates an integer minor-unit total', () => {
  const order = normalizePurchaseOrderInput({
    supplierId: 'supplier-id',
    currency: 'XOF',
    lines: [
      { productId: 'product-a', quantity: 3, unitCostMinor: 1250 },
      { productId: 'product-b', quantity: 2, unitCostMinor: 850 },
    ],
  });
  assert.equal(order.totalMinor, 5450);
  assert.equal(order.lines.length, 2);
});

test('purchase order rejects duplicate products, fractional quantities and overflow', () => {
  const line = { productId: 'product-a', quantity: 2, unitCostMinor: 100 };
  assert.throws(() => normalizePurchaseOrderInput({ supplierId: 's', currency: 'USD', lines: [line, line] }));
  assert.throws(() => normalizePurchaseOrderInput({ supplierId: 's', currency: 'USD', lines: [{ ...line, quantity: 1.5 }] }));
  assert.throws(() => normalizePurchaseOrderInput({
    supplierId: 's', currency: 'USD',
    lines: [{ productId: 'p', quantity: 1000000, unitCostMinor: Number.MAX_SAFE_INTEGER }],
  }));
});

test('receipt lines cannot exceed ordered quantities and status supports partial receipts', () => {
  const orderLines = [{ _id: 'line-1', productId: 'product-1', quantity: 10, receivedQuantity: 3 }];
  assert.deepEqual(normalizeReceiptLines([{ lineId: 'line-1', quantity: 4 }], orderLines), [
    { lineId: 'line-1', productId: 'product-1', quantity: 4 },
  ]);
  assert.throws(() => normalizeReceiptLines([{ lineId: 'line-1', quantity: 8 }], orderLines));
  assert.equal(getPurchaseOrderStatus([{ quantity: 10, receivedQuantity: 7 }]), 'partially_received');
  assert.equal(getPurchaseOrderStatus([{ quantity: 10, receivedQuantity: 10 }]), 'received');
});