const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const {
  buildCustomerFilter,
  normalizeCustomerInput,
  normalizePagination,
} = require('../services/customerService');

const router = express.Router();
router.use(authMiddleware);

async function resolveCompanyPermission(req, res, companyId, permission) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    return null;
  }

  const access = await resolveCompanyAccess({
    firebaseUid: req.user?.uid,
    companyId,
    permission,
  });
  if (access.error) {
    res.status(access.error.status).json({ error: access.error.message });
    return null;
  }

  return access;
}

function sendValidationError(res, error) {
  return res.status(400).json({ error: error.message });
}

router.get('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'customers:read');
    if (!access) return;

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = buildCustomerFilter({
      companyId: access.company._id,
      search: req.query.q,
      status: req.query.status,
    });
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les clients.' });
  }
});

router.post('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'customers:create');
    if (!access) return;

    let customerInput;
    try {
      customerInput = normalizeCustomerInput(req.body);
    } catch (error) {
      return sendValidationError(res, error);
    }

    const customer = await Customer.create({
      ...customerInput,
      companyId: access.company._id,
      createdBy: access.user._id,
    });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'customer.create',
      entityType: 'customer',
      entityId: customer._id,
      changedFields: Object.keys(customerInput),
    });

    return res.status(201).json({ success: true, data: customer });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de créer le client.' });
  }
});

router.patch('/:customerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.customerId)) {
      return res.status(400).json({ error: 'Identifiant client invalide.' });
    }

    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Client introuvable.' });

    const access = await resolveCompanyPermission(req, res, customer.companyId, 'customers:update');
    if (!access) return;

    let customerInput;
    try {
      customerInput = normalizeCustomerInput(req.body, { partial: true });
    } catch (error) {
      return sendValidationError(res, error);
    }

    Object.assign(customer, customerInput);
    await customer.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'customer.update',
      entityType: 'customer',
      entityId: customer._id,
      changedFields: Object.keys(customerInput),
    });
    return res.json({ success: true, data: customer });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier le client.' });
  }
});

router.delete('/:customerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.customerId)) {
      return res.status(400).json({ error: 'Identifiant client invalide.' });
    }

    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Client introuvable.' });

    const access = await resolveCompanyPermission(req, res, customer.companyId, 'customers:delete');
    if (!access) return;

    await customer.deleteOne();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'customer.delete',
      entityType: 'customer',
      entityId: customer._id,
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de supprimer le client.' });
  }
});

module.exports = router;