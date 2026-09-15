const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

/* ──────────────────────────────────────────────
   POST /reports → signaler un contenu
   Body: { targetType, targetId, reason, details? }
────────────────────────────────────────────── */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body || {};

    const allowedTypes = ['company', 'service', 'user', 'review'];
    if (!allowedTypes.includes(targetType)) {
      return res.status(400).json({ error: 'Type de contenu invalide' });
    }
    if (!targetId || !String(targetId).trim()) {
      return res.status(400).json({ error: 'Identifiant du contenu manquant' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Raison du signalement manquante' });
    }

    const user = await User.findOne({ firebaseUid: req.user?.uid }).select('_id');
    const reporterId = user?._id || null;

    const report = await Report.create({
      reporterId,
      targetType,
      targetId: String(targetId).trim(),
      reason: String(reason).trim(),
      details: String(details || '').trim(),
      status: 'pending',
    });

    res.status(201).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
