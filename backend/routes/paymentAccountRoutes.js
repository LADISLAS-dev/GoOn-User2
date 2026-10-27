const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/company');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const {
  createPaypalOnboarding,
  createStripeOnboarding,
  getPaymentAccountStatus,
} = require('../services/paymentAccountService');

const router = express.Router();
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
  if (!categories.includes('2')) {
    res.status(400).json({ error: 'La connexion des paiements est réservée aux restaurants.' });
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