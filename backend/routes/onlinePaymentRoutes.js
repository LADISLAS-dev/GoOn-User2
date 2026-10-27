const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/company');
const SalesOrder = require('../models/SalesOrder');
const { logAuditEvent } = require('../services/auditLogService');
const {
  authorizePaypalOrder,
  verifyStripeCheckoutSession,
} = require('../services/onlinePaymentService');

const router = express.Router();

function appReturnUrl(orderId, status) {
  const configured = String(process.env.ONLINE_PAYMENT_RETURN_URL || '').trim();
  let url;
  try {
    url = new URL(configured);
  } catch (_) {
    throw Object.assign(new Error('Une URL HTTPS de retour vers GoOn est requise.'), { status: 503 });
  }
  if (url.protocol !== 'https:') {
    throw Object.assign(new Error('L’URL de retour GoOn doit utiliser HTTPS.'), { status: 503 });
  }
  url.searchParams.set('orderId', String(orderId));
  url.searchParams.set('paymentStatus', status);
  return url.toString();
}

router.get('/stripe/return', async (req, res) => {
  let order;
  try {
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return res.status(400).send('Session de paiement manquante.');
    order = await SalesOrder.findOne({ stripeCheckoutSessionId: sessionId, channel: 'restaurant_app' });
    if (!order) return res.status(404).send('Commande introuvable.');
    if (order.paymentStatus === 'authorized') return res.redirect(appReturnUrl(order._id, 'authorized'));
    if (order.status !== 'draft') return res.redirect(appReturnUrl(order._id, 'failed'));

    const company = await Company.findById(order.companyId).select('paymentAccounts');
    if (!company) return res.status(404).send('Restaurant introuvable.');
    order.stripePaymentIntentId = await verifyStripeCheckoutSession(order, company, sessionId);
    order.paymentStatus = 'authorized';
    await order.save();
    await logAuditEvent(req, {
      companyId: order.companyId,
      actorId: null,
      actorType: 'guest',
      action: 'sales_order.payment',
      entityType: 'sales_order',
      entityId: order._id,
      changedFields: ['paymentStatus'],
    });
    return res.redirect(appReturnUrl(order._id, 'authorized'));
  } catch (_) {
    if (order) return res.redirect(appReturnUrl(order._id, 'failed'));
    return res.status(503).send('Impossible de vérifier le paiement.');
  }
});

router.get('/paypal/return', async (req, res) => {
  let order;
  try {
    const paypalOrderId = String(req.query.token || '').trim();
    if (!paypalOrderId) return res.status(400).send('Commande PayPal manquante.');
    order = await SalesOrder.findOne({ paypalOrderId, channel: 'restaurant_app' });
    if (!order) return res.status(404).send('Commande introuvable.');
    if (order.paymentStatus === 'authorized') return res.redirect(appReturnUrl(order._id, 'authorized'));
    if (order.status !== 'draft') return res.redirect(appReturnUrl(order._id, 'failed'));

    const company = await Company.findById(order.companyId).select('paymentAccounts');
    if (!company) return res.status(404).send('Restaurant introuvable.');
    order.paypalAuthorizationId = await authorizePaypalOrder(order, company, paypalOrderId);
    order.paymentStatus = 'authorized';
    await order.save();
    await logAuditEvent(req, {
      companyId: order.companyId,
      actorId: null,
      actorType: 'guest',
      action: 'sales_order.payment',
      entityType: 'sales_order',
      entityId: order._id,
      changedFields: ['paymentStatus'],
    });
    return res.redirect(appReturnUrl(order._id, 'authorized'));
  } catch (_) {
    if (order) return res.redirect(appReturnUrl(order._id, 'failed'));
    return res.status(503).send('Impossible de vérifier le paiement.');
  }
});

router.get('/cancel', async (req, res) => {
  const orderId = String(req.query.orderId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).send('Commande invalide.');
  try {
    return res.redirect(appReturnUrl(orderId, 'cancelled'));
  } catch (_) {
    return res.status(503).send('Impossible de retourner dans GoOn.');
  }
});

module.exports = router;
