const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const InventoryMovement = require('../models/InventoryMovement');
const Company = require('../models/company');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const SalesOrder = require('../models/SalesOrder');
const SalesOrderPayment = require('../models/SalesOrderPayment');
const authMiddleware = require('../middleware/authMiddleware');
const { resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const { normalizePagination } = require('../services/customerService');
const { buildInvoiceInputFromSalesOrder, normalizeManualPayment } = require('../services/invoiceService');
const { canDisplayPublicRestaurantMenu } = require('../services/productService');
const {
  calculateRestaurantOrderTotals,
  canTransitionSalesOrder,
  getSalesOrderPaymentStatus,
  normalizeRestaurantCheckoutInput,
  normalizeSalesOrderInput,
} = require('../services/salesOrderService');
const {
  assertOnlinePaymentReady,
  captureOnlinePayment,
  createPaypalOrder,
  createStripeCheckoutSession,
  recordCapturedPayment,
  voidOnlinePayment,
} = require('../services/onlinePaymentService');

const router = express.Router();
const PUBLIC_ORDER_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_ORDER_MAX_REQUESTS = 6;
const publicOrderAttempts = new Map();

function allowPublicRestaurantOrder(req, companyId) {
  const now = Date.now();
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const key = `${companyId}:${ip}`;
  const current = publicOrderAttempts.get(key);
  if (!current || now - current.startedAt >= PUBLIC_ORDER_WINDOW_MS) {
    publicOrderAttempts.set(key, { startedAt: now, count: 1 });
  } else if (current.count >= PUBLIC_ORDER_MAX_REQUESTS) {
    return false;
  } else {
    current.count += 1;
  }

  if (publicOrderAttempts.size > 10000) {
    for (const [attemptKey, attempt] of publicOrderAttempts) {
      if (now - attempt.startedAt >= PUBLIC_ORDER_WINDOW_MS) publicOrderAttempts.delete(attemptKey);
    }
  }
  return true;
}

router.post('/public/company/:companyId/checkout', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }
    const company = await Company.findById(req.params.companyId)
      .select('categoryId categoryIds businessTypeId setupStatus profileValidatedAt paymentAccounts')
      .lean();
    if (!canDisplayPublicRestaurantMenu(company)) {
      return res.status(404).json({ error: 'Restaurant introuvable.' });
    }
    if (!allowPublicRestaurantOrder(req, company._id)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' });
    }

    let input;
    try {
      input = normalizeRestaurantCheckoutInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    if (input.paymentMethod !== 'pay_at_venue') {
      assertOnlinePaymentReady(input.paymentMethod, input.currency, company);
    }
    const productIds = input.lines.map((line) => line.productId);
    if (productIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Identifiant article invalide.' });
    }
    const products = await Product.find({
      _id: { $in: productIds },
      companyId: company._id,
      status: 'active',
      isAvailable: { $ne: false },
    }).select('_id name sku priceMinor currency');
    if (products.length !== productIds.length) {
      return res.status(409).json({ error: 'Un ou plusieurs articles ne sont plus disponibles.' });
    }

    const productsById = new Map(products.map((product) => [String(product._id), product]));
    let subtotalMinor = 0;
    const lines = input.lines.map((line) => {
      const product = productsById.get(line.productId);
      if (product.currency !== input.currency) {
        throw Object.assign(new Error('Tous les articles doivent utiliser la même devise.'), { status: 400 });
      }
      const lineTotalMinor = line.quantity * product.priceMinor;
      if (!Number.isSafeInteger(lineTotalMinor) || !Number.isSafeInteger(subtotalMinor + lineTotalMinor)) {
        throw Object.assign(new Error('Le total de la commande est trop élevé.'), { status: 400 });
      }
      subtotalMinor += lineTotalMinor;
      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: line.quantity,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor,
      };
    });
    const { tipMinor, totalMinor } = calculateRestaurantOrderTotals(subtotalMinor, input.tipRateBps);
    const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await SalesOrder.create({
      companyId: company._id,
      createdBy: null,
      updatedBy: null,
      orderNumber,
      status: 'draft',
      channel: 'restaurant_app',
      tableNumber: input.tableNumber,
      tipRateBps: input.tipRateBps,
      tipMinor,
      paymentMethod: input.paymentMethod,
      currency: input.currency,
      customer: input.customer,
      lines,
      totalMinor,
      notes: input.notes,
    });
    let checkoutUrl = '';
    if (input.paymentMethod !== 'pay_at_venue') {
      try {
        if (input.paymentMethod === 'stripe') {
          const checkout = await createStripeCheckoutSession(order, company);
          order.stripeCheckoutSessionId = checkout.stripeCheckoutSessionId;
          order.stripePaymentIntentId = checkout.stripePaymentIntentId;
          checkoutUrl = checkout.url;
        } else {
          const checkout = await createPaypalOrder(order, company);
          order.paypalOrderId = checkout.paypalOrderId;
          checkoutUrl = checkout.url;
        }
        await order.save();
      } catch (error) {
        order.paymentStatus = 'failed';
        await order.save();
        throw error;
      }
    }
    await logAuditEvent(req, {
      companyId: company._id,
      actorId: null,
      actorType: 'guest',
      action: 'sales_order.create',
      entityType: 'sales_order',
      entityId: order._id,
      changedFields: ['channel', 'tableNumber', 'customer', 'lines', 'tipMinor', 'totalMinor', 'paymentMethod'],
    });
    return res.status(201).json({
      success: true,
      data: { ...order.toObject(), ...(checkoutUrl ? { checkoutUrl } : {}) },
    });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'Impossible d’envoyer la commande.' });
  }
});

router.use(authMiddleware);

async function resolveSalesAccess(req, res, companyId, permission) {
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

router.get('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveSalesAccess(req, res, req.params.companyId, 'orders:read');
    if (!access) return;
    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id };
    if (['draft', 'confirmed', 'fulfilled', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
    const [orders, total] = await Promise.all([
      SalesOrder.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SalesOrder.countDocuments(filter),
    ]);
    const payments = orders.length
      ? await SalesOrderPayment.find({ companyId: access.company._id, salesOrderId: { $in: orders.map((order) => order._id) } })
        .sort({ receivedAt: -1 })
        .lean()
      : [];
    const paymentsByOrder = new Map();
    for (const payment of payments) {
      const key = String(payment.salesOrderId);
      paymentsByOrder.set(key, [...(paymentsByOrder.get(key) || []), payment]);
    }
    return res.json({
      success: true,
      data: orders.map((order) => ({
        ...order,
        paidMinor: Number(order.paidMinor || 0),
        paymentStatus: order.paymentStatus || 'unpaid',
        payments: paymentsByOrder.get(String(order._id)) || [],
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      capabilities: {
        canCreate: access.isOwner || access.role?.permissions?.includes('orders:create'),
        canManage: access.isOwner || access.role?.permissions?.includes('orders:manage'),
        canInvoice: access.isOwner || access.role?.permissions?.includes('invoices:create'),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les commandes.' });
  }
});

router.post('/:orderId/payments', async (req, res) => {
  let companyId;
  let paymentInput;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ error: 'Identifiant commande invalide.' });
    }
    const summary = await SalesOrder.findById(req.params.orderId).select('companyId');
    if (!summary) return res.status(404).json({ error: 'Commande introuvable.' });
    const access = await resolveSalesAccess(req, res, summary.companyId, 'orders:manage');
    if (!access) return;
    companyId = access.company._id;

    const order = await SalesOrder.findOne({ _id: req.params.orderId, companyId }).select('paymentMethod currency status totalMinor paidMinor');
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (order.paymentMethod !== 'pay_at_venue') {
      return res.status(409).json({ error: 'Cette commande doit être réglée par son prestataire de paiement.' });
    }
    if (!['confirmed', 'fulfilled'].includes(order.status)) {
      return res.status(409).json({ error: 'Confirme la commande avant d’enregistrer son règlement.' });
    }
    try {
      paymentInput = normalizeManualPayment(req.body, order.currency);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const existing = await SalesOrderPayment.findOne({ companyId, idempotencyKey: paymentInput.idempotencyKey }).lean();
    if (existing) {
      if (String(existing.salesOrderId) !== String(order._id) || existing.amountMinor !== paymentInput.amountMinor) {
        return res.status(409).json({ error: 'Cette clé de règlement a déjà été utilisée.' });
      }
      const latestOrder = await SalesOrder.findOne({ _id: order._id, companyId }).lean();
      return res.json({ success: true, data: { order: latestOrder, payment: existing }, duplicate: true });
    }

    const session = await mongoose.startSession();
    let payment;
    let updatedOrder;
    let duplicate = false;
    try {
      await session.withTransaction(async () => {
        const freshOrder = await SalesOrder.findOne({
          _id: order._id,
          companyId,
          status: { $in: ['confirmed', 'fulfilled'] },
        }).session(session);
        if (!freshOrder) throw Object.assign(new Error('La commande a changé de statut.'), { status: 409 });

        const previousPayment = await SalesOrderPayment.findOne({ companyId, idempotencyKey: paymentInput.idempotencyKey }).session(session);
        if (previousPayment) {
          if (String(previousPayment.salesOrderId) !== String(freshOrder._id) || previousPayment.amountMinor !== paymentInput.amountMinor) {
            throw Object.assign(new Error('Cette clé de règlement a déjà été utilisée.'), { status: 409 });
          }
          payment = previousPayment;
          updatedOrder = freshOrder;
          duplicate = true;
          return;
        }

        const paidMinor = Number(freshOrder.paidMinor || 0);
        if (paidMinor + paymentInput.amountMinor > freshOrder.totalMinor) {
          throw Object.assign(new Error('Le règlement dépasse le solde de la commande.'), { status: 400 });
        }
        [payment] = await SalesOrderPayment.create([{
          ...paymentInput,
          companyId,
          salesOrderId: freshOrder._id,
          recordedBy: access.user._id,
        }], { session });
        freshOrder.paidMinor = paidMinor + paymentInput.amountMinor;
        freshOrder.paymentStatus = getSalesOrderPaymentStatus(freshOrder.totalMinor, freshOrder.paidMinor);
        freshOrder.updatedBy = access.user._id;
        await freshOrder.save({ session });
        updatedOrder = freshOrder;
      });
    } finally {
      await session.endSession();
    }

    if (!duplicate) {
      await logAuditEvent(req, {
        companyId,
        actorId: access.user._id,
        action: 'sales_order.payment',
        entityType: 'sales_order_payment',
        entityId: payment._id,
        changedFields: ['amountMinor', 'method', 'paymentStatus', 'reference'],
      });
    }
    return res.status(duplicate ? 200 : 201).json({ success: true, data: { order: updatedOrder, payment }, duplicate });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    if (error?.code === 11000 && companyId && paymentInput) {
      const existing = await SalesOrderPayment.findOne({ companyId, idempotencyKey: paymentInput.idempotencyKey }).lean();
      if (existing && String(existing.salesOrderId) === String(req.params.orderId) && existing.amountMinor === paymentInput.amountMinor) {
        const order = await SalesOrder.findOne({ _id: req.params.orderId, companyId }).lean();
        return res.json({ success: true, data: { order, payment: existing }, duplicate: true });
      }
      return res.status(409).json({ error: 'Cette clé de règlement a déjà été utilisée.' });
    }
    if (error?.code === 20 || error?.codeName === 'IllegalOperation') {
      return res.status(503).json({ error: 'Le rapprochement atomique nécessite MongoDB en replica set.' });
    }
    return res.status(500).json({ error: 'Impossible d’enregistrer le règlement de la commande.' });
  }
});

router.post('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveSalesAccess(req, res, req.params.companyId, 'orders:create');
    if (!access) return;
    let input;
    try {
      input = normalizeSalesOrderInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    let customer = input.customer;
    let customerId = null;
    if (input.customerId) {
      if (!mongoose.Types.ObjectId.isValid(input.customerId)) {
        return res.status(400).json({ error: 'Identifiant client invalide.' });
      }
      const savedCustomer = await Customer.findOne({
        _id: input.customerId,
        companyId: access.company._id,
      }).select('_id name email phone').lean();
      if (!savedCustomer) return res.status(404).json({ error: 'Client introuvable dans cette entreprise.' });
      customerId = savedCustomer._id;
      customer = {
        name: savedCustomer.name,
        email: savedCustomer.email || '',
        phone: savedCustomer.phone || '',
      };
    }

    const productIds = input.lines.map((line) => line.productId);
    if (productIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }
    const products = await Product.find({
      _id: { $in: productIds },
      companyId: access.company._id,
      status: 'active',
      isAvailable: { $ne: false },
    }).select('_id name sku priceMinor currency');
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Un produit de la commande est introuvable dans cette entreprise.' });
    }

    const productById = new Map(products.map((product) => [String(product._id), product]));
    let totalMinor = 0;
    const lines = input.lines.map((line) => {
      const product = productById.get(line.productId);
      if (product.currency !== input.currency) {
        throw Object.assign(new Error('Tous les produits doivent utiliser la devise de la commande.'), { status: 400 });
      }
      const lineTotalMinor = line.quantity * product.priceMinor;
      if (!Number.isSafeInteger(lineTotalMinor) || !Number.isSafeInteger(totalMinor + lineTotalMinor)) {
        throw Object.assign(new Error('Le total de la commande est trop élevé.'), { status: 400 });
      }
      totalMinor += lineTotalMinor;
      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: line.quantity,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor,
      };
    });

    const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = await SalesOrder.create({
      companyId: access.company._id,
      customerId,
      createdBy: access.user._id,
      updatedBy: access.user._id,
      orderNumber,
      status: 'draft',
      currency: input.currency,
      customer,
      lines,
      totalMinor,
      notes: input.notes,
    });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'sales_order.create',
      entityType: 'sales_order',
      entityId: order._id,
      changedFields: ['customer', 'lines', 'totalMinor'],
    });
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'Impossible de créer la commande.' });
  }
});

router.post('/:orderId/invoice', async (req, res) => {
  let companyId;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ error: 'Identifiant commande invalide.' });
    }
    const summary = await SalesOrder.findById(req.params.orderId).select('companyId');
    if (!summary) return res.status(404).json({ error: 'Commande introuvable.' });
    const access = await resolveSalesAccess(req, res, summary.companyId, 'invoices:create');
    if (!access) return;
    companyId = access.company._id;

    const order = await SalesOrder.findOne({ _id: req.params.orderId, companyId: access.company._id }).lean();
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    const existing = await Invoice.findOne({ companyId: access.company._id, sourceSalesOrderId: order._id }).lean();
    if (existing) return res.json({ success: true, data: existing, created: false });

    let input;
    try {
      input = buildInvoiceInputFromSalesOrder(order);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
    const invoice = await Invoice.create({
      ...input,
      companyId: access.company._id,
      customerId: order.customerId && await Customer.exists({
        _id: order.customerId,
        companyId: access.company._id,
      }) ? order.customerId : null,
      sourceSalesOrderId: order._id,
      createdBy: access.user._id,
      updatedBy: access.user._id,
      invoiceNumber: '',
      status: 'draft',
    });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'invoice.create',
      entityType: 'invoice',
      entityId: invoice._id,
      changedFields: ['sourceSalesOrderId', 'customer', 'lines', 'totalMinor'],
    });
    return res.status(201).json({ success: true, data: invoice, created: true });
  } catch (error) {
    if (error?.code === 11000 && companyId) {
      const invoice = await Invoice.findOne({ companyId, sourceSalesOrderId: req.params.orderId }).lean();
      if (invoice) return res.json({ success: true, data: invoice, created: false });
    }
    return res.status(500).json({ error: 'Impossible de créer la facture depuis cette commande.' });
  }
});

async function transitionSalesOrder(req, res, action) {
  if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
    return res.status(400).json({ error: 'Identifiant commande invalide.' });
  }
  const summary = await SalesOrder.findById(req.params.orderId).select('companyId');
  if (!summary) return res.status(404).json({ error: 'Commande introuvable.' });
  const access = await resolveSalesAccess(req, res, summary.companyId, 'orders:manage');
  if (!access) return;

  if (action === 'cancel') {
    const cancellationOrder = await SalesOrder.findOne({ _id: req.params.orderId, companyId: access.company._id })
      .select('status paymentMethod paymentStatus stripePaymentIntentId paypalAuthorizationId');
    if (cancellationOrder
      && ['stripe', 'paypal'].includes(cancellationOrder.paymentMethod)
      && cancellationOrder.paymentStatus === 'authorized') {
      try {
        await voidOnlinePayment(cancellationOrder, access.company);
        cancellationOrder.paymentStatus = 'voided';
        await cancellationOrder.save();
      } catch (error) {
        return res.status(error.status || 502).json({
          error: 'Le paiement n’a pas pu être libéré. La commande reste inchangée.',
        });
      }
    }
  }

  const session = await mongoose.startSession();
  let finalOrder;
  let captureRequired = false;
  try {
    await session.withTransaction(async () => {
      const order = await SalesOrder.findOne({ _id: req.params.orderId, companyId: access.company._id }).session(session);
      if (!order) throw Object.assign(new Error('Commande introuvable.'), { status: 404 });
      const onlinePayment = ['stripe', 'paypal'].includes(order.paymentMethod);
      if (action === 'confirm' && onlinePayment && order.status === 'confirmed' && order.paymentStatus === 'authorized') {
        captureRequired = true;
        finalOrder = order;
        return;
      }
      if (!canTransitionSalesOrder(order.status, action)) {
        throw Object.assign(new Error('Cette transition de commande est impossible.'), { status: 409 });
      }
      if (action === 'confirm' && onlinePayment && order.paymentStatus !== 'authorized') {
        throw Object.assign(new Error('Le paiement du client doit être autorisé avant de confirmer la commande.'), { status: 409 });
      }
      if (action === 'fulfill' && onlinePayment && order.paymentStatus !== 'paid') {
        throw Object.assign(new Error('La capture du paiement doit réussir avant de servir la commande.'), { status: 409 });
      }
      captureRequired = action === 'confirm' && onlinePayment;

      if (action === 'confirm' || (action === 'cancel' && order.status === 'confirmed')) {
        const restoring = action === 'cancel';
        for (const line of order.lines) {
          const delta = restoring ? line.quantity : -line.quantity;
          const stockFilter = { _id: line.productId, companyId: access.company._id };
          if (!restoring) stockFilter.stockOnHand = { $gte: line.quantity };
          const product = await Product.findOneAndUpdate(
            stockFilter,
            { $inc: { stockOnHand: delta }, $set: { updatedBy: access.user._id } },
            { new: true, session, runValidators: true }
          );
          if (!product) {
            throw Object.assign(new Error('Stock insuffisant ou produit indisponible.'), { status: 409 });
          }
          await InventoryMovement.create([{
            companyId: access.company._id,
            productId: product._id,
            actorId: access.user._id,
            delta,
            reason: restoring ? 'return' : 'sale',
            note: `${restoring ? 'Cancelled' : 'Sales order'} ${order.orderNumber}`,
            balanceAfter: product.stockOnHand,
          }], { session });
        }
      }

      if (action === 'confirm') {
        order.status = 'confirmed';
        order.confirmedAt = new Date();
      } else if (action === 'fulfill') {
        order.status = 'fulfilled';
        order.fulfilledAt = new Date();
      } else {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
      }
      order.updatedBy = access.user._id;
      await order.save({ session });
      finalOrder = order;
    });

    if (captureRequired) {
      let captured;
      try {
        captured = await captureOnlinePayment(finalOrder, access.company);
      } catch (error) {
        return res.status(error.status || 502).json({
          error: 'La commande est confirmée, mais la capture du paiement a échoué. Réessaie la capture avant de servir la commande.',
          code: 'PAYMENT_CAPTURE_PENDING',
        });
      }
      if (captured.amountMinor !== finalOrder.totalMinor) {
        return res.status(502).json({
          error: 'Le montant capturé ne correspond pas au total. La commande reste bloquée pour vérification.',
          code: 'PAYMENT_CAPTURE_AMOUNT_MISMATCH',
        });
      }

      const recorded = await recordCapturedPayment({
        orderId: finalOrder._id,
        companyId: access.company._id,
        provider: finalOrder.paymentMethod,
        transactionId: captured.transactionId,
        amountMinor: captured.amountMinor,
        currency: finalOrder.currency,
      });
      finalOrder = recorded.order;
    }

    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: `sales_order.${action}`,
      entityType: 'sales_order',
      entityId: finalOrder._id,
      changedFields: ['status', ...(action === 'confirm' || action === 'cancel' ? ['stockOnHand'] : [])],
    });
    return res.json({ success: true, data: finalOrder });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    if (error?.code === 20 || error?.codeName === 'IllegalOperation') {
      return res.status(503).json({ error: 'La confirmation atomique exige MongoDB en replica set, comme MongoDB Atlas.' });
    }
    return res.status(500).json({ error: 'Impossible de mettre à jour la commande.' });
  } finally {
    await session.endSession();
  }
}

router.post('/:orderId/confirm', (req, res) => transitionSalesOrder(req, res, 'confirm'));
router.post('/:orderId/fulfill', (req, res) => transitionSalesOrder(req, res, 'fulfill'));
router.post('/:orderId/cancel', (req, res) => transitionSalesOrder(req, res, 'cancel'));

module.exports = router;