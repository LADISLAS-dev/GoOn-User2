const crypto = require('crypto');
const Company = require('../models/company');

function configurationError(message) {
  return Object.assign(new Error(message), { status: 503 });
}

function getStripeMode() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (/^(sk|rk)_live_/.test(key)) return 'live';
  if (/^(sk|rk)_test_/.test(key)) return 'test';
  return null;
}

function getStripeConnectClientId(mode = getStripeMode()) {
  if (!['test', 'live'].includes(mode)) return '';
  return String(
    process.env[`STRIPE_CONNECT_CLIENT_ID_${mode.toUpperCase()}`]
    || process.env.STRIPE_CONNECT_CLIENT_ID
    || ''
  ).trim();
}

function getStripeConnectRedirectUri() {
  const explicit = String(process.env.STRIPE_CONNECT_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  const apiBase = String(process.env.ONLINE_PAYMENT_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(apiBase)) return '';
  return `${apiBase}/payment-accounts/stripe/oauth/callback`;
}

function stripeModeField(mode) {
  return mode === 'live' ? 'liveAccountId' : 'testAccountId';
}

function legacyStripeModeField(mode) {
  return mode === 'live' ? 'legacyLiveAccountId' : 'legacyTestAccountId';
}

function createStripeOAuthAuthorizationUrl({ clientId, redirectUri, state, email, businessName }) {
  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('stripe_user[country]', 'US');
  url.searchParams.set('stripe_user[currency]', 'usd');
  url.searchParams.append('stripe_user[requested_capabilities][]', 'card_payments');
  if (email) url.searchParams.set('stripe_user[email]', email);
  if (businessName) url.searchParams.set('stripe_user[business_name]', businessName);
  return url.toString();
}

function stripeOAuthStateHash(state) {
  return crypto.createHash('sha256').update(String(state)).digest('hex');
}

function resetStripeCapabilities(stripeStatus) {
  stripeStatus.detailsSubmitted = false;
  stripeStatus.chargesEnabled = false;
  stripeStatus.payoutsEnabled = false;
}

function activateStripeMode(stripeStatus, mode) {
  if (stripeStatus.mode === mode) return;
  const previousMode = stripeStatus.mode;
  const previousAccountId = stripeStatus.accountId;
  if (previousMode && previousAccountId) {
    stripeStatus[stripeModeField(previousMode)] = previousAccountId;
  }
  stripeStatus.mode = mode;
  stripeStatus.accountId = stripeStatus[stripeModeField(mode)] || (!previousMode ? previousAccountId : '') || '';
  resetStripeCapabilities(stripeStatus);
}

function isMissingStripeAccount(error) {
  return error?.code === 'resource_missing' || error?.raw?.code === 'resource_missing';
}

function archiveMismatchedStripeAccount(stripeStatus, mode) {
  const otherMode = mode === 'live' ? 'test' : 'live';
  const otherField = stripeModeField(otherMode);
  const currentField = stripeModeField(mode);
  const staleAccountId = stripeStatus.accountId;
  if (stripeStatus[currentField] === staleAccountId) stripeStatus[currentField] = '';
  if (staleAccountId && !stripeStatus[otherField]) stripeStatus[otherField] = staleAccountId;
  stripeStatus.mode = mode;
  stripeStatus.accountId = stripeStatus[currentField] || '';
  resetStripeCapabilities(stripeStatus);
}

async function resolveStripeAccount(stripe, stripeStatus, mode) {
  activateStripeMode(stripeStatus, mode);
  if (!stripeStatus.accountId) return null;

  let account;
  try {
    if (['express', 'standard'].includes(stripeStatus.accountType)) {
      account = await stripe.accounts.retrieve(stripeStatus.accountId);
    } else {
      try {
        account = await stripe.v2.core.accounts.retrieve(stripeStatus.accountId, {
          include: ['configuration.merchant', 'identity', 'requirements', 'defaults'],
        });
      } catch (error) {
        if (!isMissingStripeAccount(error)) throw error;
        account = await stripe.accounts.retrieve(stripeStatus.accountId);
        stripeStatus.accountType = 'express';
      }
    }
  } catch (error) {
    if (!isMissingStripeAccount(error)) throw error;
    archiveMismatchedStripeAccount(stripeStatus, mode);
    return null;
  }

  if (typeof account.livemode === 'boolean' && account.livemode !== (mode === 'live')) {
    archiveMismatchedStripeAccount(stripeStatus, mode);
    return null;
  }

  stripeStatus.mode = mode;
  stripeStatus[stripeModeField(mode)] = stripeStatus.accountId;
  return account;
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

async function createStripeOnboarding(company, stripe = null) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw configurationError('Stripe Connect n’est pas configuré sur le serveur.');
  }
  const mode = getStripeMode();
  if (!mode) throw configurationError('La clé Stripe doit être une clé secrète valide en mode test ou live.');
  const returnUrl = String(process.env.STRIPE_CONNECT_RETURN_URL || '').trim();
  const refreshUrl = String(process.env.STRIPE_CONNECT_REFRESH_URL || '').trim();
  if (!returnUrl || !refreshUrl) {
    throw configurationError('Les URL de retour Stripe Connect doivent être configurées.');
  }

  stripe ||= stripeClient();
  const stripeStatus = ensurePaymentAccounts(company).stripe;
  let accountId = stripeStatus.accountId;
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      contact_email: company.email || undefined,
      display_name: company.name || undefined,
      dashboard: 'express',
      defaults: {
        currency: 'usd',
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'stripe',
          requirements_collector: 'stripe',
        },
      },
      identity: {
        country: 'US',
        entity_type: 'company',
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
      },
      include: ['configuration.merchant', 'identity', 'requirements', 'defaults'],
    }, { idempotencyKey: `goon_connect_v2_${company._id}` });
    accountId = account.id;
    stripeStatus.accountId = accountId;
    stripeStatus.accountType = 'v2_full';
    stripeStatus.mode = mode;
    stripeStatus[stripeModeField(mode)] = accountId;
    resetStripeCapabilities(stripeStatus);
    await company.save();
  }

  const accountLink = ['express', 'standard'].includes(stripeStatus.accountType)
    ? await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      })
    : await stripe.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            refresh_url: refreshUrl,
            return_url: returnUrl,
          },
        },
      });
  return { url: accountLink.url, accountId };
}

async function completeStripeOAuth({ code, state, error }) {
  if (typeof state !== 'string' || state.length < 32) {
    throw Object.assign(new Error('État OAuth Stripe invalide.'), { status: 400 });
  }

  const company = await Company.findOne({
    'paymentAccounts.stripe.oauthStateHash': stripeOAuthStateHash(state),
    'paymentAccounts.stripe.oauthStateExpiresAt': { $gt: new Date() },
  }).select('+paymentAccounts.stripe.oauthStateHash +paymentAccounts.stripe.oauthStateExpiresAt');
  if (!company) throw Object.assign(new Error('La demande OAuth Stripe a expiré.'), { status: 400 });

  const stripeStatus = ensurePaymentAccounts(company).stripe;
  stripeStatus.oauthStateHash = '';
  stripeStatus.oauthStateExpiresAt = null;
  await company.save();

  if (error === 'access_denied') return { cancelled: true };
  if (error || typeof code !== 'string' || !code) {
    throw Object.assign(new Error('Stripe n’a pas autorisé la connexion.'), { status: 400 });
  }

  const mode = getStripeMode();
  if (!mode) throw configurationError('La clé Stripe doit être une clé secrète valide en mode test ou live.');
  const token = await stripeClient().oauth.token({ grant_type: 'authorization_code', code });
  if (!token?.stripe_user_id || token.livemode !== (mode === 'live')) {
    throw Object.assign(new Error('Le compte Stripe retourné ne correspond pas au mode configuré.'), { status: 409 });
  }

  const previousAccountId = stripeStatus.accountId;
  const previousMode = stripeStatus.mode || mode;
  if (previousAccountId && previousAccountId !== token.stripe_user_id) {
    const archiveField = legacyStripeModeField(previousMode);
    stripeStatus[archiveField] = stripeStatus[archiveField] || previousAccountId;
  }

  stripeStatus.accountId = token.stripe_user_id;
  stripeStatus.accountType = 'standard';
  stripeStatus.mode = mode;
  stripeStatus[stripeModeField(mode)] = token.stripe_user_id;
  resetStripeCapabilities(stripeStatus);
  await company.save();

  return { connected: true, companyId: String(company._id) };
}

async function disconnectStripeOAuthAccount(company, accountId, mode) {
  const stripeStatus = company.paymentAccounts?.stripe;
  if (stripeStatus?.accountType !== 'standard'
    || String(stripeStatus.accountId || '') !== String(accountId || '')) {
    return false;
  }

  const activeMode = mode === 'live' ? 'live' : 'test';
  const legacyField = legacyStripeModeField(activeMode);
  stripeStatus[legacyField] = stripeStatus[legacyField] || stripeStatus.accountId;
  if (stripeStatus[stripeModeField(activeMode)] === stripeStatus.accountId) {
    stripeStatus[stripeModeField(activeMode)] = '';
  }
  stripeStatus.accountId = '';
  stripeStatus.mode = activeMode;
  resetStripeCapabilities(stripeStatus);
  await company.save();
  return true;
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
  const mode = getStripeMode();
  let payoutDestination = null;
  if (mode) {
    let account = null;
    let stripe = null;
    if (stripeStatus.accountId || stripeStatus.mode !== mode) {
      stripe = stripeClient();
      account = await resolveStripeAccount(stripe, stripeStatus, mode);
    } else {
      stripeStatus.mode = mode;
    }
    if (account) {
      if (['express', 'standard'].includes(stripeStatus.accountType)) {
        stripeStatus.detailsSubmitted = Boolean(account.details_submitted);
        stripeStatus.chargesEnabled = Boolean(account.charges_enabled);
        stripeStatus.payoutsEnabled = Boolean(account.payouts_enabled);
      } else {
        const capabilities = account.configuration?.merchant?.capabilities || {};
        stripeStatus.detailsSubmitted = Boolean(account.configuration?.merchant?.applied || account.identity?.country);
        stripeStatus.chargesEnabled = capabilities.card_payments?.status === 'active';
        stripeStatus.payoutsEnabled = capabilities.stripe_balance?.payouts?.status === 'active';
      }
      if (stripeStatus.accountType === 'custom') {
        stripe ||= stripeClient();
        try {
          const externalAccounts = await stripe.accounts.listExternalAccounts(stripeStatus.accountId, { limit: 10 });
          const destination = externalAccounts.data.find((item) => item.default_for_currency) || externalAccounts.data[0];
          if (destination) {
            payoutDestination = {
              type: destination.object === 'card' ? 'card' : 'bank_account',
              brand: destination.brand || '',
              bankName: destination.bank_name || '',
              last4: destination.last4 || '',
            };
          }
        } catch (_) {
          payoutDestination = null;
        }
      }
    } else {
      resetStripeCapabilities(stripeStatus);
    }
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
      accountType: stripeStatus.accountType || 'v2_full',
      detailsSubmitted: Boolean(stripeStatus.detailsSubmitted),
      chargesEnabled: Boolean(stripeStatus.chargesEnabled),
      payoutsEnabled: Boolean(stripeStatus.payoutsEnabled),
      payoutDestination,
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
  completeStripeOAuth,
  createStripeOAuthAuthorizationUrl,
  disconnectStripeOAuthAccount,
  getStripeMode,
  getStripeConnectClientId,
  getPaypalBaseUrl,
  paypalAccessToken,
  getPaypalMerchantIntegration,
  getPaymentAccountStatus,
};