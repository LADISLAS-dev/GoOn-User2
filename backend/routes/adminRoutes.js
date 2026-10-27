const express = require('express');
const AuditLog = require('../models/AuditLog');
const Appointment = require('../models/Appointment');
const BusinessModule = require('../models/BusinessModule');
const BusinessType = require('../models/BusinessType');
const Company = require('../models/company');
const Customer = require('../models/Customer');
const SalesOrderPayment = require('../models/SalesOrderPayment');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const { logAuditEvent } = require('../services/auditLogService');
const { normalizePagination } = require('../services/customerService');
const {
  normalizeBusinessTypeKey,
  normalizeBusinessTypePayload,
} = require('../services/businessTypeService');

const router = express.Router();

router.get('/access', authMiddleware, (req, res) => {
  return res.json({ isSuperAdmin: superAdminMiddleware.isSuperAdmin(req.user) });
});

router.use(superAdminMiddleware);

async function getAdminActorId(req, res) {
  const user = await User.findOne({ firebaseUid: req.user?.uid }).select('_id');
  if (!user) {
    res.status(401).json({ error: 'Le compte administrateur doit être initialisé dans GoOn.' });
    return null;
  }
  return user._id;
}

async function validateModuleKeys(moduleKeys) {
  const modules = await BusinessModule.find({ key: { $in: moduleKeys } })
    .select('key')
    .lean();
  const activeKeys = new Set(modules.map((module) => module.key));
  return moduleKeys.filter((key) => !activeKeys.has(key));
}

router.get('/catalog', async (req, res) => {
  try {
    const [businessTypes, businessModules] = await Promise.all([
      BusinessType.find({}).sort({ sortOrder: 1, key: 1 }).lean(),
      BusinessModule.find({}).sort({ sortOrder: 1, key: 1 }).lean(),
    ]);
    return res.json({ success: true, data: { businessTypes, businessModules } });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger le catalogue admin.' });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const [companies, users, customers, appointments, activeBusinessTypes, activeModules, companyTypes] = await Promise.all([
      Company.countDocuments(),
      User.countDocuments(),
      Customer.countDocuments(),
      Appointment.countDocuments(),
      BusinessType.countDocuments({ active: true }),
      BusinessModule.countDocuments({ active: true }),
      Company.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                { $cond: [{ $eq: ['$businessTypeId', ''] }, null, '$businessTypeId'] },
                '$categoryId',
              ],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
    ]);

    const types = await BusinessType.find({ key: { $in: companyTypes.map((item) => item._id).filter(Boolean) } })
      .select('key labels icon')
      .lean();
    const typeByKey = new Map(types.map((type) => [type.key, type]));

    return res.json({
      success: true,
      data: {
        totals: { companies, users, customers, appointments, activeBusinessTypes, activeModules },
        companiesByType: companyTypes.map((item) => ({
          key: String(item._id || 'legacy'),
          label: typeByKey.get(String(item._id))?.labels?.en || String(item._id || 'Legacy'),
          icon: typeByKey.get(String(item._id))?.icon || '🏢',
          count: item.count,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les statistiques plateforme.' });
  }
});

router.get('/restaurant-payments', async (req, res) => {
  try {
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = {};
    if (req.query.companyId) {
      if (!/^[a-f\d]{24}$/i.test(String(req.query.companyId))) {
        return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
      }
      filter.companyId = new mongoose.Types.ObjectId(String(req.query.companyId));
    }
    const methods = new Set(['cash', 'bank_transfer', 'card_manual', 'mobile_money_manual', 'other']);
    if (req.query.method && methods.has(String(req.query.method))) filter.method = String(req.query.method);

    const [payments, total, totalsByCurrency] = await Promise.all([
      SalesOrderPayment.find(filter)
        .populate('companyId', 'name')
        .populate('salesOrderId', 'orderNumber customer tableNumber channel paymentStatus totalMinor')
        .populate('recordedBy', 'name email')
        .sort({ receivedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SalesOrderPayment.countDocuments(filter),
      SalesOrderPayment.aggregate([
        { $match: filter },
        { $group: { _id: '$currency', count: { $sum: 1 }, amountMinor: { $sum: '$amountMinor' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totalsByCurrency: totalsByCurrency.map((row) => ({ currency: row._id, count: row.count, amountMinor: row.amountMinor })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les paiements restaurant.' });
  }
});

router.get('/businesses', async (req, res) => {
  try {
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = {};
    const search = String(req.query.q || '').trim().slice(0, 100);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }
    if (req.query.businessTypeId) {
      filter.businessTypeId = String(req.query.businessTypeId).trim().slice(0, 48);
    }

    const [businesses, total] = await Promise.all([
      Company.find(filter)
        .select('_id name businessTypeId categoryId isVerified setupStatus createdAt ownerId')
        .populate('ownerId', 'name')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Company.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: businesses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les entreprises.' });
  }
});

router.post('/business-types', async (req, res) => {
  try {
    let key;
    let payload;
    try {
      key = normalizeBusinessTypeKey(req.body?.key);
      payload = normalizeBusinessTypePayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const unknownModules = await validateModuleKeys(payload.moduleKeys);
    if (unknownModules.length) {
      return res.status(400).json({ error: 'Modules actifs inconnus.', unknownModules });
    }

    const actorId = await getAdminActorId(req, res);
    if (!actorId) return;
    const businessType = await BusinessType.create({ key, ...payload });

    await logAuditEvent(req, {
      scope: 'platform',
      actorId,
      action: 'business_type.create',
      entityType: 'business_type',
      entityId: businessType.key,
      changedFields: ['name', 'moduleKeys', 'active'],
    });

    return res.status(201).json({ success: true, data: businessType });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Cette clé de domaine existe déjà.' });
    }
    return res.status(500).json({ error: 'Impossible de créer ce domaine.' });
  }
});

router.patch('/business-types/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '').trim().toLowerCase();
    const businessType = await BusinessType.findOne({ key });
    if (!businessType) return res.status(404).json({ error: 'Domaine introuvable.' });

    let payload;
    try {
      payload = normalizeBusinessTypePayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const unknownModules = await validateModuleKeys(payload.moduleKeys);
    if (unknownModules.length) {
      return res.status(400).json({ error: 'Modules actifs inconnus.', unknownModules });
    }

    const actorId = await getAdminActorId(req, res);
    if (!actorId) return;
    businessType.set(payload);
    await businessType.save();

    await logAuditEvent(req, {
      scope: 'platform',
      actorId,
      action: 'business_type.update',
      entityType: 'business_type',
      entityId: businessType.key,
      changedFields: Object.keys(payload).filter((field) => field !== 'sortOrder'),
    });

    return res.json({ success: true, data: businessType });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier ce domaine.' });
  }
});

router.patch('/business-modules/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    const module = await BusinessModule.findOne({ key });
    if (!module) return res.status(404).json({ error: 'Module introuvable.' });
    if (module.mandatory) return res.status(400).json({ error: 'Ce module est obligatoire.' });
    if (typeof req.body?.active !== 'boolean') {
      return res.status(400).json({ error: 'Le statut active doit être un booléen.' });
    }

    const actorId = await getAdminActorId(req, res);
    if (!actorId) return;
    module.active = req.body.active;
    await module.save();

    await logAuditEvent(req, {
      scope: 'platform',
      actorId,
      action: 'business_module.update',
      entityType: 'business_module',
      entityId: module.key,
      changedFields: ['active'],
    });

    return res.json({ success: true, data: module });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier ce module.' });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const [logs, total] = await Promise.all([
      AuditLog.find({ scope: 'platform' })
        .select('actorId action entityType entityId changedFields createdAt')
        .populate('actorId', 'name email')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ scope: 'platform' }),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger le journal plateforme.' });
  }
});

module.exports = router;