const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createCardSetupUrl,
  listUserCards,
  removeUserCard,
  setDefaultUserCard,
} = require('../services/userCardVaultService');

const router = express.Router();
router.use(authMiddleware);

async function getAuthenticatedUser(req) {
  const firebaseUid = req.user?.uid;
  if (!firebaseUid) throw Object.assign(new Error('Authentification requise.'), { status: 401 });
  const user = await User.findOne({ firebaseUid }).select('+stripeCustomerId');
  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  return user;
}

router.get('/', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    return res.json({ success: true, data: await listUserCards(user) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Impossible de charger les cartes.' });
  }
});

router.post('/stripe/setup', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (req.body?.consent !== true) {
      return res.status(400).json({ error: 'Le consentement à l’enregistrement de la carte est requis.' });
    }
    const consentVersion = 'saved-card-off-session-v1';
    user.stripeCardConsentAt = new Date();
    user.stripeCardConsentVersion = consentVersion;
    await user.save();
    return res.json({ success: true, data: await createCardSetupUrl(user, consentVersion) });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Impossible de démarrer la configuration de carte.' });
  }
});

router.patch('/stripe/:paymentMethodId/default', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    await setDefaultUserCard(user, String(req.params.paymentMethodId || ''));
    return res.json({ success: true });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Impossible de définir cette carte par défaut.' });
  }
});

router.delete('/stripe/:paymentMethodId', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    await removeUserCard(user, String(req.params.paymentMethodId || ''));
    return res.json({ success: true });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Impossible de supprimer cette carte.' });
  }
});

module.exports = router;
