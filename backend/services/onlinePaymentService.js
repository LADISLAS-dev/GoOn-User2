const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder');
const SalesOrderPayment = require('../models/SalesOrderPayment');
const { getSalesOrderPaymentStatus } = require('./salesOrderService');
const { logAuditEvent } = require('./auditLogService');
const { getPaypalBaseUrl, paypalAccessToken } = require('./paymentAccountService');

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw fail(503, 'Stripe Connect n’est pas configuré sur le serveur.');
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getOnlinePaymentApiBaseUrl() {
  const value = String(process.env.ONLINE_PAYMENT_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!/^https:\/\//i.test(value)) throw fail(503, 'Une URL HTTPS publique est requise pour les retours de paiement.');
  return value;
}

function getCompanyPaymentAccount(company, provider) {
  const account = company.paymentAccounts?.[provider];
  if (provider === 'stripe' && (!account?.accountId || !account.chargesEnabled || !account.payoutsEnabled)) {
    throw fail(409, 'Le compte Stripe du restaurant doit terminer son activation.');
  }
  if (provider === 'paypal' && (!account?.merchantId || account.onboardingStatus !== 'connected')) {
    throw fail(409, 'Le compte PayPal du restaurant doit terminer son activation.');
  }
  return account;
}

function assertOnlineOrder(order) {
  if (!['stripe', 'paypal'].includes(order.paymentMethod)) throw fail(400, 'Le mode de paiement en ligne est invalide.');
  if (order.currency !== 'USD' || !Number.isSafeInteger(order.totalMinor) || order.totalMinor < 1) {
    throw fail(400, 'Le paiement en ligne exige un total positif en USD.');
  }
}

function assertOnlinePaymentReady(paymentMethod, currency, company) {
  assertOnlineOrder({ paymentMethod, currency, totalMinor: 1 });
  getOnlinePaymentApiBaseUrl();
  const returnUrl = String(process.env.ONLINE_PAYMENT_RETURN_URL || '').trim();
  if (!returnUrl.startsWith('https://')) throw fail(503, 'Une URL HTTPS de retour vers GoOn est requise.');
  getCompanyPaymentAccount(company, paymentMethod);
  if (paymentMethod === 'stripe') {
    getStripe();
    if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) throw fail(503, 'Le webhook Stripe Connect n’est pas configuré.');
  } else {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || !process.env.PAYPAL_PARTNER_ID) {
      throw fail(503, 'PayPal Commerce Platform n’est pas configuré sur le serveur.');
    }
    if (!process.env.PAYPAL_WEBHOOK_ID) throw fail(503, 'Le webhook PayPal n’est pas configuré.');
  }
}

function getPublicPaymentOptions(company) {
  const apiBase = String(process.env.ONLINE_PAYMENT_API_BASE_URL || '').trim();
  const appReturn = String(process.env.ONLINE_PAYMENT_RETURN_URL || '').trim();
  const urlsReady = /^https:\/\//i.test(apiBase) && /^https:\/\//i.test(appReturn);
  return {
    stripe: Boolean(
      urlsReady
      && process.env.STRIPE_SECRET_KEY
      && process.env.STRIPE_CONNECT_WEBHOOK_SECRET
      && company.paymentAccounts?.stripe?.accountId
      && company.paymentAccounts?.stripe?.chargesEnabled
      && company.paymentAccounts?.stripe?.payoutsEnabled
    ),
    paypal: Boolean(
      urlsReady
      && process.env.PAYPAL_CLIENT_ID
      && process.env.PAYPAL_CLIENT_SECRET
      && process.env.PAYPAL_PARTNER_ID
      && process.env.PAYPAL_WEBHOOK_ID
      && company.paymentAccounts?.paypal?.merchantId
      && company.paymentAccounts?.paypal?.onboardingStatus === 'connected'
    ),
  };
}

function paypalAuthAssertion(merchantId) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: process.env.PAYPAL_CLIENT_ID, payer_id: merchantId })).toString('base64url');
  return `${header}.${payload}.`;
}

async function paypalRequest(path, { method = 'GET', body, merchantId, requestId } = {}) {
  const token = await paypalAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'PayPal-Auth-Assertion': paypalAuthAssertion(merchantId),
  };
  if (process.env.PAYPAL_PARTNER_ATTRIBUTION_ID) headers['PayPal-Partner-Attribution-Id'] = process.env.PAYPAL_PARTNER_ATTRIBUTION_ID;
  if (requestId) headers['PayPal-Request-Id'] = requestId;
  const response = await fetch(`${getPaypalBaseUrl()}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw fail(502, payload.message || 'La requête PayPal a échoué.');
  return payload;
}

async function createStripeCheckoutSession(order, company) {
  assertOnlineOrder(order);
  const account = getCompanyPaymentAccount(company, 'stripe');
  const apiBase = getOnlinePaymentApiBaseUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Restaurant order ${order.orderNumber}` },
        unit_amount: order.totalMinor,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      capture_method: 'manual',
      metadata: { salesOrderId: String(order._id), companyId: String(company._id) },
    },
    metadata: { salesOrderId: String(order._id), companyId: String(company._id) },
    success_url: `${apiBase}/online-payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${apiBase}/online-payments/cancel?orderId=${encodeURIComponent(order._id)}`,
  }, { stripeAccount: account.accountId, idempotencyKey: `goon_checkout_${order._id}` });
  if (!session.url) throw new Error('Stripe n’a pas retourné de lien de paiement.');
  return { url: session.url, stripeCheckoutSessionId: session.id, stripePaymentIntentId: session.payment_intent || '' };
}

async function createPaypalOrder(order, company) {
  assertOnlineOrder(order);
  const account = getCompanyPaymentAccount(company, 'paypal');
  const apiBase = getOnlinePaymentApiBaseUrl();
  const payload = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    merchantId: account.merchantId,
    requestId: `goon_order_${order._id}`,
    body: {
      intent: 'AUTHORIZE',
      purchase_units: [{
        reference_id: String(order._id),
        custom_id: String(order._id),
        invoice_id: order.orderNumber,
        payee: { merchant_id: account.merchantId },
        amount: { currency_code: 'USD', value: (order.totalMinor / 100).toFixed(2) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: `${apiBase}/online-payments/paypal/return`,
            cancel_url: `${apiBase}/online-payments/cancel?orderId=${encodeURIComponent(order._id)}`,
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
          },
        },
      },
    },
  });
  const approvalUrl = payload.links?.find((link) => ['payer-action', 'approve'].includes(link.rel))?.href;
  if (!payload.id || !approvalUrl) throw new Error('PayPal n’a pas retourné de lien de validation.');
  return { url: approvalUrl, paypalOrderId: payload.id };
}

async function authorizePaypalOrder(order, company, paypalOrderId) {
  if (String(order.paypalOrderId) !== String(paypalOrderId)) throw fail(400, 'La commande PayPal ne correspond pas à cette commande GoOn.');
  const account = getCompanyPaymentAccount(company, 'paypal');
  const payload = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/authorize`, {
    method: 'POST',
    merchantId: account.merchantId,
    requestId: `goon_authorize_${order._id}`,
  });
  const authorization = payload.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!authorization?.id || !['CREATED', 'PENDING'].includes(authorization.status)) throw fail(402, 'PayPal n’a pas autorisé le paiement.');
  return authorization.id;
}

async function verifyStripeCheckoutSession(order, company, sessionId) {
  if (String(order.stripeCheckoutSessionId) !== String(sessionId)) throw fail(400, 'La session Stripe ne correspond pas à cette commande.');
  const account = getCompanyPaymentAccount(company, 'stripe');
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: account.accountId });
  if (session.mode !== 'payment'
    || String(session.metadata?.salesOrderId) !== String(order._id)
    || session.amount_total !== order.totalMinor
    || String(session.currency).toUpperCase() !== order.currency) {
    throw fail(409, 'Les informations de paiement Stripe ne correspondent pas à la commande.');
  }
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw fail(402, 'Stripe n’a pas créé de paiement.');
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: account.accountId });
  if (intent.status !== 'requires_capture' || intent.amount !== order.totalMinor || intent.currency.toUpperCase() !== order.currency) {
    throw fail(402, 'Le paiement Stripe n’est pas autorisé.');
  }
  return paymentIntentId;
}

async function captureOnlinePayment(order, company) {
  assertOnlineOrder(order);
  if (order.paymentStatus !== 'authorized') throw fail(409, 'La commande ne possède pas de paiement autorisé à capturer.');
  if (order.paymentMethod === 'stripe') {
    const account = getCompanyPaymentAccount(company, 'stripe');
    const intent = await getStripe().paymentIntents.capture(order.stripePaymentIntentId, {}, {
      stripeAccount: account.accountId,
      idempotencyKey: `goon_capture_${order._id}`,
    });
    if (intent.status !== 'succeeded') throw fail(402, 'Stripe n’a pas capturé le paiement.');
    return { transactionId: intent.id, amountMinor: intent.amount_received || order.totalMinor };
  }

  const account = getCompanyPaymentAccount(company, 'paypal');
  const capture = await paypalRequest(`/v2/payments/authorizations/${encodeURIComponent(order.paypalAuthorizationId)}/capture`, {
    method: 'POST',
    merchantId: account.merchantId,
    requestId: `goon_capture_${order._id}`,
    body: { amount: { currency_code: 'USD', value: (order.totalMinor / 100).toFixed(2) }, final_capture: true },
  });
  if (capture.status !== 'COMPLETED') throw fail(402, 'PayPal n’a pas capturé le paiement.');
  return { transactionId: capture.id, amountMinor: Math.round(Number(capture.amount?.value || 0) * 100) };
}

async function voidOnlinePayment(order, company) {
  if (!['stripe', 'paypal'].includes(order.paymentMethod) || order.paymentStatus !== 'authorized') return;
  if (order.paymentMethod === 'stripe') {
    const account = getCompanyPaymentAccount(company, 'stripe');
    const intent = await getStripe().paymentIntents.cancel(order.stripePaymentIntentId, {}, {
      stripeAccount: account.accountId,
      idempotencyKey: `goon_void_${order._id}`,
    });
    if (intent.status !== 'canceled') throw fail(502, 'Stripe n’a pas libéré l’autorisation.');
    return;
  }
  const account = getCompanyPaymentAccount(company, 'paypal');
  const result = await paypalRequest(`/v2/payments/authorizations/${encodeURIComponent(order.paypalAuthorizationId)}/void`, {
    method: 'POST',
    merchantId: account.merchantId,
    requestId: `goon_void_${order._id}`,
  });
  if (result.status && result.status !== 'VOIDED') throw fail(502, 'PayPal n’a pas libéré l’autorisation.');
}

async function recordCapturedPayment({ orderId, companyId, provider, transactionId, amountMinor, currency }) {
  if (!['stripe', 'paypal'].includes(provider)
    || !transactionId
    || !Number.isSafeInteger(amountMinor)
    || amountMinor < 1) {
    throw fail(400, 'Les informations de capture sont invalides.');
  }
  const session = await mongoose.startSession();
  let finalOrder;
  let payment;
  try {
    await session.withTransaction(async () => {
      const order = await SalesOrder.findOne({ _id: orderId, companyId }).session(session);
      if (!order) throw fail(404, 'Commande introuvable.');
      if (order.paymentMethod !== provider
        || order.currency !== String(currency || '').toUpperCase()
        || amountMinor !== order.totalMinor) {
        throw fail(409, 'La capture ne correspond pas au montant de la commande.');
      }
      const idempotencyKey = `online_${provider}_${transactionId}`;
      payment = await SalesOrderPayment.findOne({ companyId, idempotencyKey }).session(session);
      if (!payment) {
        [payment] = await SalesOrderPayment.create([{
          companyId,
          salesOrderId: order._id,
          recordedBy: null,
          idempotencyKey,
          amountMinor,
          currency: order.currency,
          method: provider,
          reference: transactionId,
          providerTransactionId: transactionId,
          status: 'captured',
        }], { session });
      }
      order.paidMinor = amountMinor;
      order.paymentStatus = getSalesOrderPaymentStatus(order.totalMinor, order.paidMinor);
      await order.save({ session });
      finalOrder = order;
    });
  } finally {
    await session.endSession();
  }
  await logAuditEvent({ ip: '', get: () => '' }, {
    companyId,
    actorId: null,
    actorType: 'system',
    action: 'sales_order.payment',
    entityType: 'sales_order_payment',
    entityId: payment._id,
    changedFields: ['amountMinor', 'method', 'paymentStatus', 'reference'],
  });
  return { order: finalOrder, payment };
}

module.exports = {
  assertOnlinePaymentReady,
  authorizePaypalOrder,
  captureOnlinePayment,
  createPaypalOrder,
  createStripeCheckoutSession,
  getPublicPaymentOptions,
  recordCapturedPayment,
  verifyStripeCheckoutSession,
  voidOnlinePayment,
};
