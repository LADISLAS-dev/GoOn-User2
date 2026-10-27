const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPaypalOnboarding,
  createStripeOnboarding,
  getPaymentAccountStatus,
} = require('../services/paymentAccountService');
const {
  assertOnlinePaymentReady,
  getPublicPaymentOptions,
} = require('../services/onlinePaymentService');

test('payment account status reports unconnected providers without external calls', async () => {
  const company = { paymentAccounts: { stripe: {}, paypal: {} } };

  assert.deepEqual(await getPaymentAccountStatus(company), {
    stripe: {
      connected: false,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    },
    paypal: { connected: false, pending: false },
  });
});

test('Stripe onboarding fails closed when the platform secret is missing', async () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    await assert.rejects(
      createStripeOnboarding({ _id: 'company-test', paymentAccounts: { stripe: {} } }),
      (error) => error.status === 503 && /pas configuré/.test(error.message)
    );
  } finally {
    if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalSecret;
  }
});

test('PayPal onboarding requires explicit data-sharing consent', async () => {
  await assert.rejects(
    createPaypalOnboarding({ _id: 'company-test' }, { shareDataConsent: false }),
    (error) => error.status === 400 && /consentement PayPal/.test(error.message)
  );
});

test('public checkout hides online providers until merchant and platform are ready', () => {
  assert.deepEqual(getPublicPaymentOptions({ paymentAccounts: {} }), { stripe: false, paypal: false });
});

test('Stripe checkout refuses a connected account that cannot accept charges', () => {
  const keys = [
    'ONLINE_PAYMENT_API_BASE_URL',
    'ONLINE_PAYMENT_RETURN_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_CONNECT_WEBHOOK_SECRET',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    ONLINE_PAYMENT_API_BASE_URL: 'https://api.example.test',
    ONLINE_PAYMENT_RETURN_URL: 'https://app.example.test/payment-result',
    STRIPE_SECRET_KEY: 'sk_test_not_used',
    STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_not_used',
  });
  try {
    assert.throws(
      () => assertOnlinePaymentReady('stripe', 'USD', {
        paymentAccounts: { stripe: { accountId: 'acct_test', chargesEnabled: false, payoutsEnabled: false } },
      }),
      (error) => error.status === 409
    );
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
