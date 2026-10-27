const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const InvoicePayment = require('../models/InvoicePayment');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const { normalizePagination } = require('../services/customerService');
const {
  getInvoiceStatus,
  normalizeInvoiceInput,
  normalizeManualPayment,
} = require('../services/invoiceService');

const router = express.Router();
router.use(authMiddleware);

async function resolveInvoicePermission(req, res, companyId, permission) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    return null;
  }
  const access = await resolveCompanyAccess({ firebaseUid: req.user?.uid, companyId, permission });
  if (access.error) {
    res.status(access.error.status).json({ error: access.error.message });
    return null;
  }
  return access;
}

function makeInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

router.get('/company/:companyId/summary', async (req, res) => {
  try {
    const access = await resolveInvoicePermission(req, res, req.params.companyId, 'invoices:read');
    if (!access) return;
    const now = new Date();
    const [summary] = await Invoice.aggregate([
      {
        $match: {
          companyId: access.company._id,
          status: { $in: ['issued', 'partially_paid', 'paid'] },
        },
      },
      {
        $group: {
          _id: '$currency',
          invoiceCount: { $sum: 1 },
          billedMinor: { $sum: '$totalMinor' },
          paidMinor: { $sum: '$paidMinor' },
          outstandingMinor: { $sum: { $subtract: ['$totalMinor', '$paidMinor'] } },
          overdueCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$dueAt', null] }, { $lt: ['$dueAt', now] }, { $lt: ['$paidMinor', '$totalMinor'] }] },
                1,
                0,
              ],
            },
          },
          overdueMinor: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$dueAt', null] }, { $lt: ['$dueAt', now] }, { $lt: ['$paidMinor', '$totalMinor'] }] },
                { $subtract: ['$totalMinor', '$paidMinor'] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          currency: '$_id',
          invoiceCount: 1,
          billedMinor: 1,
          paidMinor: 1,
          outstandingMinor: 1,
          overdueCount: 1,
          overdueMinor: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      data: { currencies: summary || [] },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger le résumé des factures.' });
  }
});

router.get('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveInvoicePermission(req, res, req.params.companyId, 'invoices:read');
    if (!access) return;
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id };
    if (['draft', 'issued', 'partially_paid', 'paid', 'void'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .select('invoiceNumber status customer currency lines subtotalMinor taxMinor totalMinor paidMinor issuedAt dueAt createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      capabilities: {
        canCreate: access.isOwner || access.role?.permissions?.includes('invoices:create'),
        canUpdate: access.isOwner || access.role?.permissions?.includes('invoices:update'),
        canIssue: access.isOwner || access.role?.permissions?.includes('invoices:issue'),
        canRecordPayment: access.isOwner || access.role?.permissions?.includes('invoices:pay'),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les factures.' });
  }
});

router.post('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveInvoicePermission(req, res, req.params.companyId, 'invoices:create');
    if (!access) return;

    let input;
    try {
      input = normalizeInvoiceInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    let customer = req.body?.customer;
    let customerId = null;
    if (req.body?.customerId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.customerId)) {
        return res.status(400).json({ error: 'Identifiant client invalide.' });
      }
      const savedCustomer = await Customer.findOne({ _id: req.body.customerId, companyId: access.company._id }).lean();
      if (!savedCustomer) return res.status(404).json({ error: 'Client introuvable dans cette entreprise.' });
      customerId = savedCustomer._id;
      customer = {
        name: savedCustomer.name,
        email: savedCustomer.email || '',
        phone: savedCustomer.phone || '',
        address: String(savedCustomer.address || '').slice(0, 300),
      };
    }

    customer = {
      name: String(customer?.name || '').trim(),
      email: String(customer?.email || '').trim().toLowerCase(),
      phone: String(customer?.phone || '').trim(),
      address: String(customer?.address || '').trim(),
    };
    if (!customer.name || customer.name.length > 120) {
      return res.status(400).json({ error: 'Le nom du client est obligatoire pour la facture.' });
    }
    if (customer.email && (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) {
      return res.status(400).json({ error: 'L’adresse e-mail du client est invalide.' });
    }
    if (customer.phone.length > 40 || customer.address.length > 300) {
      return res.status(400).json({ error: 'Les coordonnées du client sont trop longues.' });
    }

    const productIds = input.lines.map((line) => line.productId).filter(Boolean);
    if (productIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Identifiant produit invalide dans une ligne.' });
    }
    if (productIds.length) {
      const products = await Product.find({ _id: { $in: productIds }, companyId: access.company._id }).select('_id');
      if (products.length !== new Set(productIds.map(String)).size) {
        return res.status(400).json({ error: 'Une ligne référence un produit externe à cette entreprise.' });
      }
    }

    const invoice = await Invoice.create({
      ...input,
      companyId: access.company._id,
      customerId,
      customer,
      createdBy: access.user._id,
      updatedBy: access.user._id,
      invoiceNumber: undefined,
      status: 'draft',
    });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'invoice.create',
      entityType: 'invoice',
      entityId: invoice._id,
      changedFields: ['customerId', 'lines', 'totalMinor', 'dueAt'],
    });
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de créer la facture.' });
  }
});

router.patch('/:invoiceId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.invoiceId)) {
      return res.status(400).json({ error: 'Identifiant facture invalide.' });
    }
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
    const access = await resolveInvoicePermission(req, res, invoice.companyId, 'invoices:update');
    if (!access) return;
    if (invoice.status !== 'draft') {
      return res.status(409).json({ error: 'Une facture émise ne peut plus être modifiée.' });
    }

    let input;
    try {
      input = normalizeInvoiceInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const customerInput = req.body?.customer || {};
    const customer = {
      name: String(customerInput.name || '').trim(),
      email: String(customerInput.email || '').trim().toLowerCase(),
      phone: String(customerInput.phone || '').trim(),
      address: String(customerInput.address || '').trim(),
    };
    if (!customer.name || customer.name.length > 120) {
      return res.status(400).json({ error: 'Le nom du client est obligatoire pour la facture.' });
    }
    if (customer.email && (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) {
      return res.status(400).json({ error: 'L’adresse e-mail du client est invalide.' });
    }
    if (customer.phone.length > 40 || customer.address.length > 300) {
      return res.status(400).json({ error: 'Les coordonnées du client sont trop longues.' });
    }

    invoice.customer = customer;
    invoice.currency = input.currency;
    invoice.lines = input.lines;
    invoice.subtotalMinor = input.subtotalMinor;
    invoice.taxMinor = input.taxMinor;
    invoice.totalMinor = input.totalMinor;
    invoice.notes = input.notes;
    invoice.dueAt = input.dueAt;
    invoice.updatedBy = access.user._id;
    await invoice.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'invoice.update',
      entityType: 'invoice',
      entityId: invoice._id,
      changedFields: ['customer', 'lines', 'totalMinor', 'dueAt', 'notes'],
    });
    return res.json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier le brouillon.' });
  }
});

router.post('/:invoiceId/issue', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.invoiceId)) {
      return res.status(400).json({ error: 'Identifiant facture invalide.' });
    }
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
    const access = await resolveInvoicePermission(req, res, invoice.companyId, 'invoices:issue');
    if (!access) return;
    if (invoice.status !== 'draft') return res.status(409).json({ error: 'Seul un brouillon peut être émis.' });

    invoice.invoiceNumber = makeInvoiceNumber();
    invoice.status = 'issued';
    invoice.issuedAt = new Date();
    invoice.updatedBy = access.user._id;
    await invoice.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'invoice.issue',
      entityType: 'invoice',
      entityId: invoice._id,
      changedFields: ['invoiceNumber', 'status', 'issuedAt'],
    });
    return res.json({ success: true, data: invoice });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Le numéro de facture existe déjà, réessayez.' });
    return res.status(500).json({ error: 'Impossible d’émettre la facture.' });
  }
});

router.post('/:invoiceId/payments', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.invoiceId)) {
      return res.status(400).json({ error: 'Identifiant facture invalide.' });
    }
    const invoiceSummary = await Invoice.findById(req.params.invoiceId).select('companyId');
    if (!invoiceSummary) return res.status(404).json({ error: 'Facture introuvable.' });
    const access = await resolveInvoicePermission(req, res, invoiceSummary.companyId, 'invoices:pay');
    if (!access) return;

    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, companyId: access.company._id });
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
    if (!['issued', 'partially_paid'].includes(invoice.status)) {
      return res.status(409).json({ error: 'Cette facture ne peut pas recevoir de règlement.' });
    }

    let paymentInput;
    try {
      paymentInput = normalizeManualPayment(req.body, invoice.currency);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    if (await InvoicePayment.exists({ companyId: access.company._id, idempotencyKey: paymentInput.idempotencyKey })) {
      return res.status(409).json({ error: 'Cette clé de règlement a déjà été utilisée.' });
    }
    if (invoice.paidMinor + paymentInput.amountMinor > invoice.totalMinor) {
      return res.status(400).json({ error: 'Le règlement dépasse le solde de la facture.' });
    }

    const session = await mongoose.startSession();
    let payment;
    let updatedInvoice;
    try {
      await session.withTransaction(async () => {
        const freshInvoice = await Invoice.findOne({
          _id: invoice._id,
          companyId: access.company._id,
          status: { $in: ['issued', 'partially_paid'] },
          $expr: { $lte: [{ $add: ['$paidMinor', paymentInput.amountMinor] }, '$totalMinor'] },
        }).session(session);
        if (!freshInvoice) throw Object.assign(new Error('Le solde de la facture a changé.'), { status: 409 });

        [payment] = await InvoicePayment.create([{
          ...paymentInput,
          companyId: access.company._id,
          invoiceId: freshInvoice._id,
          recordedBy: access.user._id,
        }], { session });
        freshInvoice.paidMinor += paymentInput.amountMinor;
        freshInvoice.status = getInvoiceStatus(freshInvoice.totalMinor, freshInvoice.paidMinor, freshInvoice.status);
        freshInvoice.updatedBy = access.user._id;
        await freshInvoice.save({ session });
        updatedInvoice = freshInvoice;
      });
    } finally {
      await session.endSession();
    }

    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'invoice.payment',
      entityType: 'invoice_payment',
      entityId: payment._id,
      changedFields: ['amountMinor', 'method', 'status'],
    });
    return res.status(201).json({ success: true, data: { invoice: updatedInvoice, payment } });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    if (error?.code === 11000) return res.status(409).json({ error: 'Cette clé de règlement a déjà été utilisée.' });
    if (error?.code === 20 || error?.codeName === 'IllegalOperation') {
      return res.status(503).json({ error: 'Les règlements atomiques exigent MongoDB en replica set, comme MongoDB Atlas.' });
    }
    return res.status(500).json({ error: 'Impossible d’enregistrer le règlement.' });
  }
});

router.get('/:invoiceId/payments', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.invoiceId)) {
      return res.status(400).json({ error: 'Identifiant facture invalide.' });
    }
    const invoice = await Invoice.findById(req.params.invoiceId).select('companyId');
    if (!invoice) return res.status(404).json({ error: 'Facture introuvable.' });
    const access = await resolveInvoicePermission(req, res, invoice.companyId, 'invoices:read');
    if (!access) return;

    const payments = await InvoicePayment.find({ companyId: access.company._id, invoiceId: invoice._id })
      .populate('recordedBy', 'name')
      .sort({ receivedAt: -1 })
      .lean();
    return res.json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les règlements.' });
  }
});

module.exports = router;