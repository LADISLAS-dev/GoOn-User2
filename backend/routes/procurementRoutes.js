const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const InventoryMovement = require('../models/InventoryMovement');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const { normalizePagination } = require('../services/customerService');
const {
  getPurchaseOrderStatus,
  normalizePurchaseOrderInput,
  normalizeReceiptLines,
  normalizeSupplierInput,
} = require('../services/procurementService');

const router = express.Router();
router.use(authMiddleware);

async function resolveCompanyPermission(req, res, companyId, permission) {
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

router.get('/suppliers/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'suppliers:read');
    if (!access) return;
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id };
    if (req.query.status !== 'all') filter.status = 'active';
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      canManage: access.isOwner || access.role?.permissions?.includes('suppliers:manage'),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les fournisseurs.' });
  }
});

router.post('/suppliers/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'suppliers:manage');
    if (!access) return;
    let input;
    try {
      input = normalizeSupplierInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const supplier = await Supplier.create({ ...input, companyId: access.company._id, createdBy: access.user._id });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'supplier.create',
      entityType: 'supplier',
      entityId: supplier._id,
      changedFields: Object.keys(input),
    });
    return res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Ce fournisseur existe déjà.' });
    return res.status(500).json({ error: 'Impossible de créer le fournisseur.' });
  }
});

router.patch('/suppliers/:supplierId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.supplierId)) {
      return res.status(400).json({ error: 'Identifiant fournisseur invalide.' });
    }
    const supplier = await Supplier.findById(req.params.supplierId);
    if (!supplier) return res.status(404).json({ error: 'Fournisseur introuvable.' });
    const access = await resolveCompanyPermission(req, res, supplier.companyId, 'suppliers:manage');
    if (!access) return;
    let input;
    try {
      input = normalizeSupplierInput(req.body, { partial: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    Object.assign(supplier, input);
    await supplier.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'supplier.update',
      entityType: 'supplier',
      entityId: supplier._id,
      changedFields: Object.keys(input),
    });
    return res.json({ success: true, data: supplier });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Ce fournisseur existe déjà.' });
    return res.status(500).json({ error: 'Impossible de modifier le fournisseur.' });
  }
});

router.get('/purchase-orders/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'purchase_orders:read');
    if (!access) return;
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id };
    if (req.query.status && ['ordered', 'partially_received', 'received', 'cancelled'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('supplierId', 'name currency')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      canCreate: access.isOwner || access.role?.permissions?.includes('purchase_orders:create'),
      canReceive: access.isOwner || access.role?.permissions?.includes('purchase_orders:receive'),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les commandes fournisseur.' });
  }
});

router.post('/purchase-orders/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'purchase_orders:create');
    if (!access) return;
    let input;
    try {
      input = normalizePurchaseOrderInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!mongoose.Types.ObjectId.isValid(input.supplierId)) {
      return res.status(400).json({ error: 'Identifiant fournisseur invalide.' });
    }
    const supplier = await Supplier.findOne({ _id: input.supplierId, companyId: access.company._id, status: 'active' });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur actif introuvable.' });
    if (supplier.currency !== input.currency) {
      return res.status(400).json({ error: 'La devise doit correspondre à celle du fournisseur.' });
    }

    const productIds = input.lines.map((line) => line.productId);
    if (productIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Un identifiant produit est invalide.' });
    }
    const products = await Product.find({
      _id: { $in: productIds },
      companyId: access.company._id,
      status: 'active',
    }).select('_id name sku');
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Un ou plusieurs produits sont introuvables dans cette entreprise.' });
    }

    const productById = new Map(products.map((product) => [String(product._id), product]));
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await PurchaseOrder.create({
      companyId: access.company._id,
      supplierId: supplier._id,
      createdBy: access.user._id,
      orderNumber,
      currency: input.currency,
      expectedAt: input.expectedAt,
      notes: input.notes,
      status: 'ordered',
      lines: input.lines.map((line) => {
        const product = productById.get(line.productId);
        return {
          productId: product._id,
          sku: product.sku,
          productName: product.name,
          quantity: line.quantity,
          unitCostMinor: line.unitCostMinor,
        };
      }),
    });

    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'purchase_order.create',
      entityType: 'purchase_order',
      entityId: order._id,
      changedFields: ['supplierId', 'lines', 'status'],
    });
    await order.populate('supplierId', 'name currency');
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de créer la commande fournisseur.' });
  }
});

router.post('/purchase-orders/:orderId/receive', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
    return res.status(400).json({ error: 'Identifiant commande invalide.' });
  }
  const orderSummary = await PurchaseOrder.findById(req.params.orderId).select('companyId');
  if (!orderSummary) return res.status(404).json({ error: 'Commande fournisseur introuvable.' });
  const access = await resolveCompanyPermission(req, res, orderSummary.companyId, 'purchase_orders:receive');
  if (!access) return;

  const idempotencyKey = String(req.body?.idempotencyKey || req.get('Idempotency-Key') || '').trim();
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: 'Une clé idempotente valide est requise pour la réception.' });
  }

  const session = await mongoose.startSession();
  let finalOrder = null;
  let wasDuplicate = false;
  try {
    await session.withTransaction(async () => {
      const order = await PurchaseOrder.findOne({ _id: req.params.orderId, companyId: access.company._id }).session(session);
      if (!order) throw Object.assign(new Error('Commande fournisseur introuvable.'), { status: 404 });
      if (order.receiptKeys.includes(idempotencyKey)) {
        finalOrder = order;
        wasDuplicate = true;
        return;
      }
      if (['cancelled', 'received'].includes(order.status)) {
        throw Object.assign(new Error('Cette commande ne peut plus être réceptionnée.'), { status: 409 });
      }

      let receiptLines;
      try {
        receiptLines = normalizeReceiptLines(req.body?.lines, order.lines);
      } catch (error) {
        throw Object.assign(error, { status: 400 });
      }

      for (const receiptLine of receiptLines) {
        const orderLine = order.lines.id(receiptLine.lineId);
        const product = await Product.findOneAndUpdate(
          { _id: receiptLine.productId, companyId: access.company._id, status: 'active' },
          { $inc: { stockOnHand: receiptLine.quantity }, $set: { updatedBy: access.user._id } },
          { new: true, session, runValidators: true }
        );
        if (!product) throw Object.assign(new Error('Un produit de la commande est introuvable ou archivé.'), { status: 409 });

        orderLine.receivedQuantity += receiptLine.quantity;
        await InventoryMovement.create([{
          companyId: access.company._id,
          productId: product._id,
          actorId: access.user._id,
          delta: receiptLine.quantity,
          reason: 'restock',
          note: `Purchase order ${order.orderNumber}`,
          balanceAfter: product.stockOnHand,
        }], { session });
      }

      order.status = getPurchaseOrderStatus(order.lines);
      order.receiptKeys.push(idempotencyKey);
      await order.save({ session });
      finalOrder = order;
    });

    if (!wasDuplicate) {
      await logAuditEvent(req, {
        companyId: access.company._id,
        actorId: access.user._id,
        action: 'purchase_order.receive',
        entityType: 'purchase_order',
        entityId: finalOrder._id,
        changedFields: ['status', 'lines'],
      });
    }
    return res.json({ success: true, duplicate: wasDuplicate, data: finalOrder });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    if (error?.code === 20 || error?.codeName === 'IllegalOperation') {
      return res.status(503).json({ error: 'Les réceptions atomiques exigent MongoDB en replica set, comme MongoDB Atlas.' });
    }
    return res.status(500).json({ error: 'Impossible de réceptionner cette commande.' });
  } finally {
    await session.endSession();
  }
});

module.exports = router;