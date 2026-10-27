const express = require('express');
const Company = require('../models/company');
const SalesOrder = require('../models/SalesOrder');
const { logAuditEvent } = require('../services/auditLogService');
const {
  getPaypalBaseUrl,
  paypalAccessToken,
} = require('../services/paymentAccountService');
const {
  recordCapturedPayment,
  verifyStripeCheckoutSession,
  voidOnlinePayment,
} = require('../services/onlinePaymentService');

const router = express.Router();

async function stripeWebhookHandler(req, res) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Le webhook Stripe Connect n’est pas configuré.' });
  }
  let event;
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body,
      req.get('stripe-signature'),
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (_) {
    return res.status(400).json({ error: 'Signature Stripe invalide.' });
  }

  const resource = event.data?.object;
  if (!resource?.id || !event.account) {
    return res.json({ received: true });
  }
  try {
    if (event.type === 'checkout.session.completed' && resource.object === 'checkout.session') {
      const sessionOrder = await SalesOrder.findOne({
        stripeCheckoutSessionId: resource.id,
        channel: 'restaurant_app',
      });
      if (!sessionOrder) return res.json({ received: true });
      const sessionCompany = await Company.findById(sessionOrder.companyId).select('paymentAccounts');
      if (!sessionCompany || String(sessionCompany.paymentAccounts?.stripe?.accountId) !== String(event.account)) {
        return res.status(400).json({ error: 'Compte Stripe non correspondant.' });
      }
      const paymentIntentId = await verifyStripeCheckoutSession(sessionOrder, sessionCompany, resource.id);
      if (sessionOrder.status === 'cancelled') {
        await voidOnlinePayment({
          ...sessionOrder.toObject(),
          paymentStatus: 'authorized',
          stripePaymentIntentId: paymentIntentId,
        }, sessionCompany);
        sessionOrder.stripePaymentIntentId = paymentIntentId;
        sessionOrder.paymentStatus = 'voided';
        await sessionOrder.save();
        return res.json({ received: true });
      }
      if (sessionOrder.paymentStatus === 'unpaid') {
        sessionOrder.stripePaymentIntentId = paymentIntentId;
        sessionOrder.paymentStatus = 'authorized';
        await sessionOrder.save();
        await logAuditEvent(req, {
          companyId: sessionOrder.companyId,
          actorId: null,
          actorType: 'system',
          action: 'sales_order.payment',
          entityType: 'sales_order',
          entityId: sessionOrder._id,
          changedFields: ['paymentStatus'],
        });
      }
      return res.json({ received: true });
    }

    const intent = resource;
    if (!intent.object?.includes('payment_intent')) return res.json({ received: true });
    const order = await SalesOrder.findOne({ stripePaymentIntentId: intent.id });
    if (!order) return res.json({ received: true });
    const company = await Company.findById(order.companyId).select('paymentAccounts');
    if (!company || String(company.paymentAccounts?.stripe?.accountId) !== String(event.account)) {
      return res.status(400).json({ error: 'Compte Stripe non correspondant.' });
    }
    if (String(intent.currency || '').toUpperCase() !== order.currency || intent.amount !== order.totalMinor) {
      return res.status(400).json({ error: 'Montant Stripe non correspondant.' });
    }

    if (event.type === 'payment_intent.amount_capturable_updated'
      && intent.status === 'requires_capture'
      && order.status === 'cancelled') {
      await voidOnlinePayment({ ...order.toObject(), paymentStatus: 'authorized' }, company);
      order.paymentStatus = 'voided';
      await order.save();
    } else if (event.type === 'payment_intent.amount_capturable_updated' && intent.status === 'requires_capture') {
      if (order.paymentStatus === 'unpaid') {
        order.paymentStatus = 'authorized';
        await order.save();
        await logAuditEvent(req, {
          companyId: order.companyId,
          actorId: null,
          actorType: 'system',
          action: 'sales_order.payment',
          entityType: 'sales_order',
          entityId: order._id,
          changedFields: ['paymentStatus'],
        });
      }
    } else if (event.type === 'payment_intent.succeeded' && intent.status === 'succeeded') {
      await recordCapturedPayment({
        orderId: order._id,
        companyId: order.companyId,
        provider: 'stripe',
        transactionId: intent.id,
        amountMinor: intent.amount_received || intent.amount,
        currency: intent.currency,
      });
    } else if (event.type === 'payment_intent.canceled' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'voided';
      await order.save();
    }
    return res.json({ received: true });
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Impossible de rapprocher l’événement Stripe.' });
  }
}

async function verifyPaypalWebhook(req) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false;
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(process.env.PAYPAL_PARTNER_ATTRIBUTION_ID
        ? { 'PayPal-Partner-Attribution-Id': process.env.PAYPAL_PARTNER_ATTRIBUTION_ID }
        : {}),
    },
    body: JSON.stringify({
      auth_algo: req.get('paypal-auth-algo'),
      cert_url: req.get('paypal-cert-url'),
      transmission_id: req.get('paypal-transmission-id'),
      transmission_sig: req.get('paypal-transmission-sig'),
      transmission_time: req.get('paypal-transmission-time'),
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: req.body,
    }),
  });
  const result = await response.json();
  return response.ok && result.verification_status === 'SUCCESS';
}

router.post('/paypal', async (req, res) => {
  try {
    if (!await verifyPaypalWebhook(req)) return res.status(400).json({ error: 'Signature PayPal invalide.' });
    const event = req.body || {};
    const resource = event.resource || {};
    const related = resource.supplementary_data?.related_ids || {};
    const paypalOrderId = related.order_id || resource.id;
    if (!paypalOrderId) return res.json({ received: true });
    const order = await SalesOrder.findOne({ paypalOrderId, paymentMethod: 'paypal' });
    if (!order) return res.json({ received: true });
    const company = await Company.findById(order.companyId).select('paymentAccounts');
    if (!company?.paymentAccounts?.paypal?.merchantId) return res.status(400).json({ error: 'Compte PayPal non connecté.' });

    if (event.event_type === 'PAYMENT.AUTHORIZATION.CREATED') {
      if (resource.status !== 'CREATED'
        || resource.amount?.currency_code !== order.currency
        || Math.round(Number(resource.amount?.value || 0) * 100) !== order.totalMinor) {
        return res.status(400).json({ error: 'Autorisation PayPal non correspondante.' });
      }
      if (order.paymentStatus === 'unpaid' || order.paymentStatus === 'authorized') {
        if (order.status === 'cancelled') {
          await voidOnlinePayment({
            ...order.toObject(),
            paymentStatus: 'authorized',
            paypalAuthorizationId: resource.id,
          }, company);
          order.paymentStatus = 'voided';
          order.paypalAuthorizationId = resource.id;
          await order.save();
          return res.json({ received: true });
        }
        order.paypalAuthorizationId = resource.id;
        order.paymentStatus = 'authorized';
        await order.save();
        await logAuditEvent(req, {
          companyId: order.companyId,
          actorId: null,
          actorType: 'system',
          action: 'sales_order.payment',
          entityType: 'sales_order',
          entityId: order._id,
          changedFields: ['paymentStatus'],
        });
      }
    } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      if (resource.status !== 'COMPLETED'
        || resource.amount?.currency_code !== order.currency
        || Math.round(Number(resource.amount?.value || 0) * 100) !== order.totalMinor) {
        return res.status(400).json({ error: 'Capture PayPal non correspondante.' });
      }
      await recordCapturedPayment({
        orderId: order._id,
        companyId: order.companyId,
        provider: 'paypal',
        transactionId: resource.id,
        amountMinor: Math.round(Number(resource.amount.value) * 100),
        currency: resource.amount.currency_code,
      });
    } else if (event.event_type === 'PAYMENT.AUTHORIZATION.VOIDED' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'voided';
      await order.save();
    }
    return res.json({ received: true });
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Impossible de rapprocher l’événement PayPal.' });
  }
});

module.exports = { router, stripeWebhookHandler };
