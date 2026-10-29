const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/company');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const {
  completeStripeOAuth,
  createPaypalOnboarding,
  createStripeOnboarding,
  getPaymentAccountStatus,
} = require('../services/paymentAccountService');

const router = express.Router();

router.get('/stripe/oauth/callback', async (req, res) => {
  const returnUrl = String(process.env.STRIPE_CONNECT_RETURN_URL || process.env.ONLINE_PAYMENT_RETURN_URL || '').trim();
  if (!returnUrl) {
    return res.status(503).send('Le retour Stripe Connect n’est pas configuré.');
  }

  try {
    const result = await completeStripeOAuth({
      code: typeof req.query.code === 'string' ? req.query.code : '',
      state: typeof req.query.state === 'string' ? req.query.state : '',
      error: typeof req.query.error === 'string' ? req.query.error : '',
    });
    const destination = new URL(returnUrl);
    destination.searchParams.set('stripeConnect', result.cancelled ? 'cancelled' : 'success');
    return res.redirect(destination.toString());
  } catch (_) {
    const destination = new URL(returnUrl);
    destination.searchParams.set('stripeConnect', 'error');
    return res.redirect(destination.toString());
  }
});

router.use(authMiddleware);

async function resolveCompanyOwner(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
    res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    return null;
  }
  const access = await resolveCompanyAccess({
    firebaseUid: req.user?.uid,
    companyId: req.params.companyId,
    permission: 'orders:manage',
  });
  if (access.error) {
    res.status(access.error.status).json({ error: access.error.message });
    return null;
  }
  if (!access.isOwner) {
    res.status(403).json({ error: 'Seul le propriétaire peut connecter les comptes de versement.' });
    return null;
  }
  const categories = [
    ...(Array.isArray(access.company.categoryIds) ? access.company.categoryIds : []),
    access.company.categoryId,
    access.company.businessTypeId,
  ].map((value) => String(value || '').trim());
  if (!categories.some((categoryId) => ['2', '3'].includes(categoryId))) {
    res.status(400).json({ error: 'La connexion des paiements est réservée aux restaurants et aux entreprises Beauty & Fashion.' });
    return null;
  }
  return access.company;
}

router.get('/company/:companyId', async (req, res) => {
  try {
    const company = await resolveCompanyOwner(req, res);
    if (!company) return;
    return res.json({ success: true, data: await getPaymentAccountStatus(company) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Impossible de charger les comptes de paiement.' });
  }
});

router.post('/company/:companyId/stripe/connect', async (req, res) => {
  try {
    const company = await resolveCompanyOwner(req, res);
    if (!company) return;
    const result = await createStripeOnboarding(company);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Impossible de démarrer la connexion Stripe.' });
  }
});

router.post('/company/:companyId/paypal/connect', async (req, res) => {
  try {
    const company = await resolveCompanyOwner(req, res);
    if (!company) return;
    const result = await createPaypalOnboarding(company, req.body || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Impossible de démarrer la connexion PayPal.' });
  }
});

module.exports = router;