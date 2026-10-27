const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canTransitionSalesOrder,
  getSalesOrderPaymentStatus,
  normalizeSalesOrderInput,
  normalizeRestaurantCheckoutInput,
  calculateRestaurantOrderTotals,
} = require('../services/salesOrderService');

test('sales order payment status follows the outstanding balance', () => {
  assert.equal(getSalesOrderPaymentStatus(1000, 0), 'unpaid');
  assert.equal(getSalesOrderPaymentStatus(1000, 0, true), 'authorized');
  assert.equal(getSalesOrderPaymentStatus(1000, 400), 'partially_paid');
  assert.equal(getSalesOrderPaymentStatus(1000, 1000), 'paid');
  assert.equal(getSalesOrderPaymentStatus(0, 0), 'paid');
  assert.throws(() => getSalesOrderPaymentStatus(1000, 1001));
});

test('public restaurant checkout validates contact, table, tip and on-site payment', () => {
  const checkout = normalizeRestaurantCheckoutInput({
    currency: 'XOF',
    customer: { name: 'Samira', phone: '+221770000000' },
    tableNumber: 'A15',
    tipRateBps: 1000,
    paymentMethod: 'pay_at_venue',
    lines: [{ productId: 'p1', quantity: 2 }],
  });
  assert.equal(checkout.tableNumber, 'A15');
  assert.deepEqual(calculateRestaurantOrderTotals(5000, checkout.tipRateBps), { tipMinor: 500, totalMinor: 5500 });
  assert.throws(() => normalizeRestaurantCheckoutInput({ currency: 'XOF', lines: [{ productId: 'p1', quantity: 1 }] }));
  assert.throws(() => normalizeRestaurantCheckoutInput({ currency: 'XOF', customer: { name: 'Samira' }, tipRateBps: 100, lines: [{ productId: 'p1', quantity: 1 }] }));
  assert.throws(() => normalizeRestaurantCheckoutInput({ currency: 'XOF', customer: { name: 'Samira' }, paymentMethod: 'card', lines: [{ productId: 'p1', quantity: 1 }] }));
});

test('public restaurant checkout accepts Stripe and PayPal only in USD', () => {
  for (const paymentMethod of ['stripe', 'paypal']) {
    const checkout = normalizeRestaurantCheckoutInput({
      currency: 'USD',
      customer: { name: 'Samira' },
      paymentMethod,
      lines: [{ productId: 'p1', quantity: 1 }],
    });
    assert.equal(checkout.paymentMethod, paymentMethod);
  }
  assert.throws(() => normalizeRestaurantCheckoutInput({
    currency: 'XOF',
    customer: { name: 'Samira' },
    paymentMethod: 'stripe',
    lines: [{ productId: 'p1', quantity: 1 }],
  }));
});

test('sales order snapshots customer and accepts unique product quantities', () => {
  const order = normalizeSalesOrderInput({
    currency: 'xof',
    customer: { name: ' Awa ', email: ' AWA@example.com ' },
    lines: [{ productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 2 }],
  });
  assert.equal(order.currency, 'XOF');
  assert.equal(order.customer.name, 'Awa');
  assert.equal(order.customer.email, 'awa@example.com');
  assert.equal(order.lines.length, 2);
});

test('sales orders accept a saved customer id and ignore untrusted customer snapshots', () => {
  const customerId = '507f1f77bcf86cd799439011';
  const order = normalizeSalesOrderInput({
    customerId,
    currency: 'XOF',
    customer: { name: '', email: 'not-an-email' },
    lines: [{ productId: 'p1', quantity: 1 }],
  });

  assert.equal(order.customerId, customerId);
  assert.throws(() => normalizeSalesOrderInput({
    customerId: 'not-an-object-id', currency: 'XOF', lines: [{ productId: 'p1', quantity: 1 }],
  }));
});

test('sales order rejects duplicate products, invalid email and fractional quantity', () => {
  assert.throws(() => normalizeSalesOrderInput({ currency: 'XOF', lines: [
    { productId: 'p1', quantity: 1 }, { productId: 'p1', quantity: 2 },
  ] }));
  assert.throws(() => normalizeSalesOrderInput({ currency: 'XOF', customer: { email: 'bad' }, lines: [{ productId: 'p1', quantity: 1 }] }));
  assert.throws(() => normalizeSalesOrderInput({ currency: 'XOF', lines: [{ productId: 'p1', quantity: 1.5 }] }));
});

test('sales orders follow draft, confirm, fulfill and cancel transition rules', () => {
  assert.equal(canTransitionSalesOrder('draft', 'confirm'), true);
  assert.equal(canTransitionSalesOrder('confirmed', 'fulfill'), true);
  assert.equal(canTransitionSalesOrder('confirmed', 'cancel'), true);
  assert.equal(canTransitionSalesOrder('fulfilled', 'cancel'), false);
  assert.equal(canTransitionSalesOrder('cancelled', 'confirm'), false);
});