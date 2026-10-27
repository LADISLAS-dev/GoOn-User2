const crypto = require('crypto');

function configurationError(message) {
  return Object.assign(new Error(message), { status: 503 });
}

function ensurePaymentAccounts(company) {
  if (!company.paymentAccounts) company.paymentAccounts = {};
  if (!company.paymentAccounts.stripe) company.paymentAccounts.stripe = {};
  if (!company.paymentAccounts.paypal) company.paymentAccounts.paypal = {};
  return company.paymentAccounts;
}

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw configurationError('Stripe Connect n’est pas configuré sur le serveur.');
  }
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getPaypalBaseUrl() {
  if (process.env.PAYPAL_API_BASE_URL) return process.env.PAYPAL_API_BASE_URL.replace(/\/$/, '');
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !process.env.PAYPAL_PARTNER_ID) {
    throw configurationError('PayPal Commerce Platform n’est pas configuré sur le serveur.');
  }
  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Impossible d’obtenir un jeton PayPal.');
  }
  return payload.access_token;
}

async function getPaypalMerchantIntegration(trackingId) {
  const accessToken = await paypalAccessToken();
  const query = new URLSearchParams({ tracking_id: trackingId });
  const response = await fetch(
    `${getPaypalBaseUrl()}/v1/customer/partners/${encodeURIComponent(process.env.PAYPAL_PARTNER_ID)}/merchant-integrations?${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'PayPal-Partner-Attribution-Id': process.env.PAYPAL_PARTNER_ATTRIBUTION_ID || '',
      },
    }
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Impossible de vérifier le compte PayPal.');
  return Array.isArray(payload) ? payload[0] || null : payload;
}

async function createStripeOnboarding(company) {
  const stripe = stripeClient();
  const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL;
  const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL;
  if (!returnUrl || !refreshUrl) {
    throw configurationError('Les URL de retour Stripe Connect doivent être configurées.');
  }

  let accountId = company.paymentAccounts?.stripe?.accountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: company.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    }, { idempotencyKey: `goon_connect_${company._id}` });
    accountId = account.id;
    ensurePaymentAccounts(company).stripe.accountId = accountId;
    await company.save();
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return { url: accountLink.url, accountId };
}

async function createPaypalOnboarding(company, { shareDataConsent } = {}) {
  if (shareDataConsent !== true) {
    throw Object.assign(new Error('Le consentement PayPal est requis.'), { status: 400 });
  }
  const returnUrl = process.env.PAYPAL_CONNECT_RETURN_URL;
  if (!returnUrl) throw configurationError('L’URL de retour PayPal doit être configurée.');
  const accessToken = await paypalAccessToken();
  const trackingId = `goon_${company._id}_${crypto.randomBytes(12).toString('hex')}`;
  const response = await fetch(`${getPaypalBaseUrl()}/v2/customer/partner-referrals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Partner-Attribution-Id': process.env.PAYPAL_PARTNER_ATTRIBUTION_ID || '',
    },
    body: JSON.stringify({
      tracking_id: trackingId,
      partner_config_override: {
        return_url: returnUrl,
        return_url_description: 'Return to GoOn',
        show_add_credit_card: true,
      },
      operations: [{
        operation: 'API_INTEGRATION',
        api_integration_preference: {
          rest_api_integration: {
            integration_method: 'PAYPAL',
            integration_type: 'THIRD_PARTY',
            third_party_details: { features: ['PAYMENT', 'REFUND'] },
          },
        },
      }],
      products: ['PPCP'],
      legal_consents: [{ type: 'SHARE_DATA_CONSENT', granted: true }],
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Impossible de créer le lien PayPal.');
  }
  const actionLink = payload.links?.find((link) => link.rel === 'action_url')?.href;
  if (!actionLink) throw new Error('PayPal n’a pas retourné de lien d’activation.');

  const paymentAccounts = ensurePaymentAccounts(company);
  paymentAccounts.paypal.trackingId = trackingId;
  paymentAccounts.paypal.onboardingStatus = 'pending';
  await company.save();
  return { url: actionLink, trackingId };
}

async function getPaymentAccountStatus(company) {
  const paymentAccounts = ensurePaymentAccounts(company);
  const stripeStatus = { ...(company.paymentAccounts?.stripe?.toObject?.() || company.paymentAccounts?.stripe || {}) };
  if (stripeStatus.accountId && process.env.STRIPE_SECRET_KEY) {
    const account = await stripeClient().accounts.retrieve(stripeStatus.accountId);
    stripeStatus.detailsSubmitted = Boolean(account.details_submitted);
    stripeStatus.chargesEnabled = Boolean(account.charges_enabled);
    stripeStatus.payoutsEnabled = Boolean(account.payouts_enabled);
    Object.assign(company.paymentAccounts.stripe, stripeStatus);
    await company.save();
  }
  const paypalStatus = paymentAccounts.paypal;
  if (paypalStatus.trackingId && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PARTNER_ID) {
    const merchant = await getPaypalMerchantIntegration(paypalStatus.trackingId);
    if (merchant?.merchant_id) paypalStatus.merchantId = merchant.merchant_id;
    const hasPartnerConsent = Array.isArray(merchant?.oauth_integrations)
      && merchant.oauth_integrations.some((integration) => Array.isArray(integration.oauth_third_party) && integration.oauth_third_party.length > 0);
    paypalStatus.onboardingStatus = merchant?.payments_receivable
      && merchant?.primary_email_confirmed
      && hasPartnerConsent
      ? 'connected'
      : 'pending';
    await company.save();
  }
  return {
    stripe: {
      connected: Boolean(stripeStatus.accountId),
      detailsSubmitted: Boolean(stripeStatus.detailsSubmitted),
      chargesEnabled: Boolean(stripeStatus.chargesEnabled),
      payoutsEnabled: Boolean(stripeStatus.payoutsEnabled),
    },
    paypal: {
      connected: company.paymentAccounts?.paypal?.onboardingStatus === 'connected',
      pending: company.paymentAccounts?.paypal?.onboardingStatus === 'pending',
    },
  };
}

module.exports = {
  createPaypalOnboarding,
  createStripeOnboarding,
  getPaypalBaseUrl,
  paypalAccessToken,
  getPaypalMerchantIntegration,
  getPaymentAccountStatus,
};