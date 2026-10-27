const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildInvoiceInputFromSalesOrder,
  getInvoiceStatus,
  normalizeInvoiceInput,
  normalizeManualPayment,
} = require('../services/invoiceService');

test('sales orders map to zero-tax invoice drafts with customer and order reference', () => {
  const invoice = buildInvoiceInputFromSalesOrder({
    orderNumber: 'SO-123',
    status: 'confirmed',
    currency: 'XOF',
    customer: { name: 'Amina', email: 'AMINA@example.com', phone: '+221 77' },
    notes: 'Deliver before noon',
    lines: [{ productId: 'product-1', productName: 'Coffee', quantity: 2, unitPriceMinor: 1250 }],
  });

  assert.equal(invoice.customer.email, 'amina@example.com');
  assert.equal(invoice.subtotalMinor, 2500);
  assert.equal(invoice.taxMinor, 0);
  assert.equal(invoice.totalMinor, 2500);
  assert.match(invoice.notes, /SO-123/);
  assert.throws(() => buildInvoiceInputFromSalesOrder({ status: 'draft' }));
  assert.throws(() => buildInvoiceInputFromSalesOrder({ status: 'confirmed', customer: { name: '' } }));
});

test('restaurant order tips and table numbers carry through to the invoice draft', () => {
  const invoice = buildInvoiceInputFromSalesOrder({
    orderNumber: 'SO-REST-1',
    status: 'confirmed',
    currency: 'XOF',
    tableNumber: 'A15',
    tipMinor: 500,
    customer: { name: 'Samira' },
    lines: [{ productId: 'product-1', productName: 'Soup', quantity: 1, unitPriceMinor: 2500 }],
  });
  assert.equal(invoice.totalMinor, 3000);
  assert.equal(invoice.lines.length, 2);
  assert.match(invoice.notes, /Table A15/);
});

test('invoice totals use integer minor units and basis-point tax rates', () => {
  const invoice = normalizeInvoiceInput({
    currency: 'xof',
    lines: [
      { description: 'Service', quantity: 2, unitPriceMinor: 1250, taxRateBps: 1800 },
      { description: 'Part', quantity: 1, unitPriceMinor: 500, taxRateBps: 0 },
    ],
  });

  assert.equal(invoice.currency, 'XOF');
  assert.equal(invoice.subtotalMinor, 3000);
  assert.equal(invoice.taxMinor, 450);
  assert.equal(invoice.totalMinor, 3450);
});

test('invoice input rejects fractional quantity, invalid tax and overflow', () => {
  assert.throws(() => normalizeInvoiceInput({
    currency: 'USD', lines: [{ description: 'Item', quantity: 1.5, unitPriceMinor: 100 }],
  }));
  assert.throws(() => normalizeInvoiceInput({
    currency: 'USD', lines: [{ description: 'Item', quantity: 1, unitPriceMinor: 100, taxRateBps: 10001 }],
  }));
  assert.throws(() => normalizeInvoiceInput({
    currency: 'USD', lines: [{ description: 'Item', quantity: 1000000, unitPriceMinor: Number.MAX_SAFE_INTEGER }],
  }));
});

test('manual payment requires an allowed method, matching currency and idempotency key', () => {
  const payment = normalizeManualPayment({
    amountMinor: 2500,
    method: 'mobile_money_manual',
    currency: 'XOF',
    idempotencyKey: 'invoice_pay_12345678',
  }, 'XOF');
  assert.equal(payment.amountMinor, 2500);
  assert.throws(() => normalizeManualPayment({
    amountMinor: 100, method: 'stripe', currency: 'XOF', idempotencyKey: 'invoice_pay_12345678',
  }, 'XOF'));
  assert.throws(() => normalizeManualPayment({
    amountMinor: 100, method: 'cash', currency: 'USD', idempotencyKey: 'invoice_pay_12345678',
  }, 'XOF'));
});

test('invoice status distinguishes unpaid, partial, fully paid and void invoices', () => {
  assert.equal(getInvoiceStatus(1000, 0), 'issued');
  assert.equal(getInvoiceStatus(1000, 400), 'partially_paid');
  assert.equal(getInvoiceStatus(1000, 1000), 'paid');
  assert.equal(getInvoiceStatus(1000, 0, 'void'), 'void');
});