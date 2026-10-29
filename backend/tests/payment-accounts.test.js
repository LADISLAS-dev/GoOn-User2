const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPaypalOnboarding,
  createStripeOnboarding,
  createStripeOAuthAuthorizationUrl,
  completeStripeOAuth,
  disconnectStripeOAuthAccount,
  getStripeConnectClientId,
  getStripeMode,
  getPaymentAccountStatus,
} = require('../services/paymentAccountService');
const {
  assertOnlinePaymentReady,
  calculateStripeApplicationFee,
  getStripeAccountIdForOrder,
  getPublicPaymentOptions,
} = require('../services/onlinePaymentService');
const User = require('../models/User');

test('payment account status reports unconnected providers without external calls', async () => {
  const company = { paymentAccounts: { stripe: {}, paypal: {} } };

  assert.deepEqual(await getPaymentAccountStatus(company), {
    stripe: {
      connected: false,
      accountType: 'v2_full',
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      payoutDestination: null,
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

test('Stripe mode follows the configured secret key without exposing it', () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    assert.equal(getStripeMode(), 'test');
    process.env.STRIPE_SECRET_KEY = 'sk_live_placeholder';
    assert.equal(getStripeMode(), 'live');
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(getStripeMode(), null);
  } finally {
    if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalSecret;
  }
});

test('Stripe OAuth uses separate client IDs for test and live modes', () => {
  const previous = {
    test: process.env.STRIPE_CONNECT_CLIENT_ID_TEST,
    live: process.env.STRIPE_CONNECT_CLIENT_ID_LIVE,
    generic: process.env.STRIPE_CONNECT_CLIENT_ID,
  };
  process.env.STRIPE_CONNECT_CLIENT_ID_TEST = 'ca_test_platform';
  process.env.STRIPE_CONNECT_CLIENT_ID_LIVE = 'ca_live_platform';
  delete process.env.STRIPE_CONNECT_CLIENT_ID;
  try {
    assert.equal(getStripeConnectClientId('test'), 'ca_test_platform');
    assert.equal(getStripeConnectClientId('live'), 'ca_live_platform');
    assert.equal(getStripeConnectClientId('unknown'), '');
  } finally {
    if (previous.test === undefined) delete process.env.STRIPE_CONNECT_CLIENT_ID_TEST;
    else process.env.STRIPE_CONNECT_CLIENT_ID_TEST = previous.test;
    if (previous.live === undefined) delete process.env.STRIPE_CONNECT_CLIENT_ID_LIVE;
    else process.env.STRIPE_CONNECT_CLIENT_ID_LIVE = previous.live;
    if (previous.generic === undefined) delete process.env.STRIPE_CONNECT_CLIENT_ID;
    else process.env.STRIPE_CONNECT_CLIENT_ID = previous.generic;
  }
});

test('Stripe onboarding creates a V2 account with Stripe as losses collector', async () => {
  const keys = [
    'STRIPE_SECRET_KEY',
    'STRIPE_CONNECT_RETURN_URL',
    'STRIPE_CONNECT_REFRESH_URL',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_CONNECT_RETURN_URL: 'https://app.example.test/payment-result',
    STRIPE_CONNECT_REFRESH_URL: 'https://app.example.test/payment-setup',
  });

  const calls = [];
  let saveCount = 0;
  const company = {
    _id: 'company-test',
    email: 'owner@example.test',
    name: 'Fallback Test',
    paymentAccounts: { stripe: {} },
    async save() { saveCount += 1; },
  };
  const stripe = {
    v2: {
      core: {
        accounts: {
      async create(params, options) {
        calls.push({ type: 'create-account', params, options });
        return { id: 'acct_v2_test' };
      },
        },
        accountLinks: {
          async create(params) {
        calls.push({ type: 'create-link', params });
        return { url: 'https://connect.stripe.test/onboarding' };
      },
        },
      },
    },
  };

  try {
    const result = await createStripeOnboarding(company, stripe);
    assert.deepEqual(result, { url: 'https://connect.stripe.test/onboarding', accountId: 'acct_v2_test' });
    assert.equal(calls[0].type, 'create-account');
    assert.equal(Object.hasOwn(calls[0].params, 'type'), false);
    assert.equal(calls[0].params.contact_email, 'owner@example.test');
    assert.equal(calls[0].params.defaults.responsibilities.losses_collector, 'stripe');
    assert.equal(calls[0].params.configuration.merchant.capabilities.card_payments.requested, true);
    assert.equal(calls[0].options.idempotencyKey, 'goon_connect_v2_company-test');
    assert.deepEqual(calls[1], {
      type: 'create-link',
      params: {
        account: 'acct_v2_test',
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            refresh_url: 'https://app.example.test/payment-setup',
            return_url: 'https://app.example.test/payment-result',
          },
        },
      },
    });
    assert.equal(company.paymentAccounts.stripe.accountType, 'v2_full');
    assert.equal(company.paymentAccounts.stripe.testAccountId, 'acct_v2_test');
    assert.equal(saveCount, 1);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('Stripe onboarding keeps the V1 account-link flow for existing Express accounts', async () => {
  const keys = ['STRIPE_SECRET_KEY', 'STRIPE_CONNECT_RETURN_URL', 'STRIPE_CONNECT_REFRESH_URL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: 'sk_test_placeholder',
    STRIPE_CONNECT_RETURN_URL: 'https://app.example.test/payment-result',
    STRIPE_CONNECT_REFRESH_URL: 'https://app.example.test/payment-setup',
  });
  const calls = [];
  const stripe = {
    accountLinks: {
      async create(params) {
        calls.push(params);
        return { url: 'https://connect.stripe.test/legacy-onboarding' };
      },
    },
  };
  const company = {
    _id: 'company-legacy',
    paymentAccounts: { stripe: { accountId: 'acct_legacy', accountType: 'express' } },
  };

  try {
    const result = await createStripeOnboarding(company, stripe);
    assert.deepEqual(result, { url: 'https://connect.stripe.test/legacy-onboarding', accountId: 'acct_legacy' });
    assert.equal(calls[0].type, 'account_onboarding');
    assert.equal(calls[0].account, 'acct_legacy');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('Stripe OAuth authorization URL binds client, redirect, state and requested capability', () => {
  const url = new URL(createStripeOAuthAuthorizationUrl({
    clientId: 'ca_test_platform',
    redirectUri: 'https://api.example.test/payment-accounts/stripe/oauth/callback',
    state: 'random-state-value',
    email: 'owner@example.test',
    businessName: 'GoOn Test Restaurant',
  }));

  assert.equal(url.origin, 'https://connect.stripe.com');
  assert.equal(url.searchParams.get('client_id'), 'ca_test_platform');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://api.example.test/payment-accounts/stripe/oauth/callback');
  assert.equal(url.searchParams.get('state'), 'random-state-value');
  assert.equal(url.searchParams.get('stripe_user[email]'), 'owner@example.test');
  assert.equal(url.searchParams.get('stripe_user[business_name]'), 'GoOn Test Restaurant');
  assert.deepEqual(url.searchParams.getAll('stripe_user[requested_capabilities][]'), ['card_payments']);
});

test('Stripe OAuth callback rejects invalid state before reading any company', async () => {
  await assert.rejects(
    completeStripeOAuth({ code: 'one-time-code', state: 'short' }),
    (error) => error.status === 400 && error.message.includes('invalide')
  );
});

test('Stripe OAuth deauthorization archives the Standard account and clears active capabilities', async () => {
  const company = {
    paymentAccounts: {
      stripe: {
        accountId: 'acct_standard_live',
        accountType: 'standard',
        mode: 'live',
        liveAccountId: 'acct_standard_live',
        chargesEnabled: true,
        payoutsEnabled: true,
      },
    },
    async save() {},
  };

  assert.equal(await disconnectStripeOAuthAccount(company, 'acct_standard_live', 'live'), true);
  assert.equal(company.paymentAccounts.stripe.accountId, '');
  assert.equal(company.paymentAccounts.stripe.liveAccountId, '');
  assert.equal(company.paymentAccounts.stripe.legacyLiveAccountId, 'acct_standard_live');
  assert.equal(company.paymentAccounts.stripe.chargesEnabled, false);
  assert.equal(company.paymentAccounts.stripe.payoutsEnabled, false);
  assert.equal(await disconnectStripeOAuthAccount(company, 'acct_standard_live', 'live'), false);
});

test('Stripe restaurant fee is 3 percent plus 30 cents and never exceeds the order', () => {
  assert.equal(calculateStripeApplicationFee(1000), 60);
  assert.equal(calculateStripeApplicationFee(10000), 330);
  assert.equal(calculateStripeApplicationFee(20), 20);
});

test('Stripe orders keep using their original connected account after migration', () => {
  const company = {
    paymentAccounts: {
      stripe: {
        accountId: 'acct_custom_live',
        mode: 'live',
        legacyTestAccountId: 'acct_standard_test',
      },
    },
  };

  assert.equal(getStripeAccountIdForOrder({ stripeAccountId: 'acct_order_snapshot' }, company), 'acct_order_snapshot');
  assert.equal(getStripeAccountIdForOrder({ stripeMode: 'test' }, company), 'acct_standard_test');
  assert.equal(getStripeAccountIdForOrder({ stripeMode: 'live' }, company), 'acct_custom_live');
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

test('public checkout never exposes a sandbox connected account in live mode', () => {
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
    STRIPE_SECRET_KEY: 'sk_live_placeholder',
    STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_placeholder',
  });
  try {
    assert.equal(getPublicPaymentOptions({
      paymentAccounts: {
        stripe: {
          accountId: 'acct_test',
          mode: 'test',
          chargesEnabled: true,
          payoutsEnabled: true,
        },
      },
    }).stripe, false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
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

test('user card vault stores only a hidden Stripe customer reference, never raw card data', () => {
  assert.equal(User.schema.path('stripeCustomerId').options.select, false);
  assert.equal(User.schema.path('stripeCardConsentAt').options.select, false);
  assert.equal(User.schema.path('stripeCardConsentVersion').options.select, false);
  for (const field of ['cardNumber', 'cardCvc', 'cardExpiry', 'pan']) {
    assert.equal(User.schema.path(field), undefined);
  }
});
