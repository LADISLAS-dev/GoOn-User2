const express = require('express');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const { normalizePagination } = require('../services/customerService');

const router = express.Router();
router.use(authMiddleware);

router.get('/company/:companyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }

    const access = await resolveCompanyAccess({
      firebaseUid: req.user?.uid,
      companyId: req.params.companyId,
      permission: 'audit:read',
    });
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id };
    if (req.query.action) filter.action = String(req.query.action).slice(0, 60);
    if (req.query.entityType) filter.entityType = String(req.query.entityType).slice(0, 40);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .select('actorId action entityType entityId changedFields createdAt')
        .populate('actorId', 'name email')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger l’historique.' });
  }
});

module.exports = router;