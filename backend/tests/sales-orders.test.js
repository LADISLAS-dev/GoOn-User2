const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canTransitionSalesOrder,
  getSalesOrderPaymentStatus,
  normalizeRetailCheckoutInput,
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

test('Retail checkout requires an online payment and a valid delivery destination', () => {
  const base = {
    currency: 'USD',
    customer: { name: 'Samira' },
    paymentMethod: 'stripe',
    lines: [{ productId: 'p1', quantity: 1 }],
  };
  assert.equal(normalizeRetailCheckoutInput({ ...base, fulfillmentType: 'pickup' }).deliveryAddress, '');
  assert.deepEqual(
    normalizeRetailCheckoutInput({
      ...base,
      fulfillmentType: 'delivery',
      deliveryAddress: '10 Main Street',
      deliveryLatitude: 14.7,
      deliveryLongitude: -17.4,
    }).deliveryAddress,
    '10 Main Street',
  );
  assert.throws(() => normalizeRetailCheckoutInput({ ...base, fulfillmentType: 'delivery' }));
  assert.throws(() => normalizeRetailCheckoutInput({ ...base, fulfillmentType: 'delivery', deliveryAddress: '10 Main Street', deliveryLatitude: null, deliveryLongitude: null }));
  assert.throws(() => normalizeRetailCheckoutInput({ ...base, fulfillmentType: 'delivery', deliveryAddress: '10 Main Street', deliveryLatitude: 999, deliveryLongitude: 0 }));
  assert.throws(() => normalizeRetailCheckoutInput({ ...base, fulfillmentType: 'pickup', paymentMethod: 'pay_at_venue' }));
});

test('delivery zones require increasing distance limits and resolve the first matching band', () => {
  const { findDeliveryZone, normalizeDeliveryZones } = require('../services/deliveryService');
  const zones = normalizeDeliveryZones([
    { maxDistanceKm: 5, feeMinor: 500, currency: 'usd' },
    { maxDistanceKm: 10, feeMinor: 900, currency: 'USD' },
  ]);
  assert.equal(findDeliveryZone(zones, 4.9).feeMinor, 500);
  assert.equal(findDeliveryZone(zones, 7).feeMinor, 900);
  assert.equal(findDeliveryZone(zones, 12), null);
  assert.throws(() => normalizeDeliveryZones([
    { maxDistanceKm: 10, feeMinor: 500, currency: 'USD' },
    { maxDistanceKm: 5, feeMinor: 900, currency: 'USD' },
  ]));
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
test('takeaway orders require a name or phone and reject unknown fulfillment types', () => {
  const base = { currency: 'XOF', lines: [{ productId: 'p1', quantity: 1 }] };
  assert.throws(() => normalizeRestaurantCheckoutInput({ ...base, fulfillmentType: 'takeaway', tableNumber: '4' }));
  assert.equal(normalizeRestaurantCheckoutInput({ ...base, fulfillmentType: 'takeaway', customer: { name: 'Samira' } }).fulfillmentType, 'takeaway');
  assert.throws(() => normalizeRestaurantCheckoutInput({ ...base, fulfillmentType: 'delivery', customer: { name: 'Samira' } }));
});

test('ready is an intermediate order status before service', () => {
  assert.equal(canTransitionSalesOrder('confirmed', 'ready'), true);
  assert.equal(canTransitionSalesOrder('draft', 'ready'), false);
  assert.equal(canTransitionSalesOrder('ready', 'fulfill'), true);
  assert.equal(canTransitionSalesOrder('ready', 'cancel'), true);
  assert.equal(canTransitionSalesOrder('fulfilled', 'ready'), false);
});

test('order status notifications are localized and skip unknown statuses', () => {
  const { buildOrderStatusCopy } = require('../services/orderNotificationService');
  const context = { company: 'Chez Awa', orderNumber: 'SO-1', takeaway: true };
  assert.match(buildOrderStatusCopy('fr', 'ready', context).message, /pr\u00eate \u00e0 \u00eatre r\u00e9cup\u00e9r\u00e9e/);
  assert.match(buildOrderStatusCopy('en', 'ready', context).message, /ready for pickup/);
  assert.equal(buildOrderStatusCopy('en', 'draft', context), null);
  assert.equal(buildOrderStatusCopy('xx', 'cancelled', context).title, 'Order cancelled');
  assert.match(buildOrderStatusCopy('en', 'ready', { ...context, retail: true, delivery: true }).message, /out for delivery/);
  assert.match(buildOrderStatusCopy('fr', 'ready', { ...context, retail: true, delivery: false }).message, /prete a etre recuperee/);
});
