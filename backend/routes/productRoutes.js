const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Company = require('../models/company');
const InventoryMovement = require('../models/InventoryMovement');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');
const { hasPermission, resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const { normalizePagination } = require('../services/customerService');
const { storeUploadedFile } = require('../services/mediaStorage');
const { getPublicPaymentOptions } = require('../services/onlinePaymentService');
const { toAbsoluteMediaUrl } = require('../utils/mediaUrl');
const {
  buildProductFilter,
  canDisplayPublicRetailCatalog,
  canDisplayPublicRestaurantMenu,
  normalizeProductInput,
  normalizeStockMovement,
} = require('../services/productService');

const router = express.Router();

router.post('/company/:companyId/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }
    let access = await resolveCompanyAccess({
      firebaseUid: req.user?.uid,
      companyId: req.params.companyId,
      permission: 'products:create',
    });
    if (access.error?.status === 403) {
      access = await resolveCompanyAccess({
        firebaseUid: req.user?.uid,
        companyId: req.params.companyId,
        permission: 'products:update',
      });
    }
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });
    if (!req.file) return res.status(400).json({ error: 'Aucune image reçue.' });

    const storedUrl = await storeUploadedFile(req.file, {
      folder: 'goon/products',
      localPrefix: '/uploads/',
    });
    if (process.env.NODE_ENV === 'production' && String(storedUrl || '').startsWith('/uploads/')) {
      return res.status(500).json({
        error: 'Le stockage persistant des images n’est pas configuré.',
        code: 'MEDIA_PERSISTENCE_NOT_CONFIGURED',
      });
    }
    return res.status(201).json({ url: toAbsoluteMediaUrl(req, storedUrl) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Impossible d’envoyer l’image du produit.' });
  }
});

router.get('/public/company/:companyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }
    const company = await Company.findById(req.params.companyId)
      .select('categoryId categoryIds businessTypeId setupStatus profileValidatedAt paymentAccounts')
      .lean();
    if (!canDisplayPublicRestaurantMenu(company)) {
      return res.status(404).json({ error: 'Menu introuvable.' });
    }

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: company._id, status: 'active' };
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name description imageUrl category priceMinor currency isAvailable isFeatured likesCount badge discountPercent prepTimeMinutes calories tags allergens bulkMinQuantity bulkDiscountPercent')
        .sort({ category: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      paymentOptions: getPublicPaymentOptions(company),
    });
  } catch (_) {
    return res.status(500).json({ error: 'Impossible de charger le menu.' });
  }
});

router.get('/public/retail/company/:companyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }
    const company = await Company.findById(req.params.companyId)
      .select('categoryId categoryIds businessTypeId setupStatus profileValidatedAt paymentAccounts latitude longitude deliveryZones')
      .lean();
    if (!canDisplayPublicRetailCatalog(company)) {
      return res.status(404).json({ error: 'Catalogue Retail introuvable.' });
    }

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: company._id, status: 'active', isAvailable: { $ne: false }, stockOnHand: { $gt: 0 } };
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name description imageUrl category priceMinor currency stockOnHand isAvailable badge discountPercent bulkMinQuantity bulkDiscountPercent')
        .sort({ category: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      paymentOptions: getPublicPaymentOptions(company),
      deliveryZones: company.deliveryZones || [],
      storeLocation: { latitude: company.latitude, longitude: company.longitude },
    });
  } catch (_) {
    return res.status(500).json({ error: 'Impossible de charger le catalogue Retail.' });
  }
});

router.get('/public/company/:companyId/my-likes', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }
    const liked = await Product.find({
      companyId: req.params.companyId,
      status: 'active',
      likedBy: req.user.uid,
    }).select('_id').lean();
    return res.json({ success: true, data: liked.map((p) => String(p._id)) });
  } catch (_) {
    return res.status(500).json({ error: 'Impossible de charger vos j’aime.' });
  }
});

router.post('/public/company/:companyId/:productId/like', authMiddleware, async (req, res) => {
  try {
    const { companyId, productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    const uid = req.user.uid;
    const base = { _id: productId, companyId, status: 'active' };
    let product = await Product.findOneAndUpdate(
      { ...base, likedBy: { $ne: uid } },
      { $addToSet: { likedBy: uid }, $inc: { likesCount: 1 } },
      { new: true, timestamps: false }
    ).select('likesCount').lean();
    let liked = true;
    if (!product) {
      product = await Product.findOneAndUpdate(
        { ...base, likedBy: uid },
        { $pull: { likedBy: uid }, $inc: { likesCount: -1 } },
        { new: true, timestamps: false }
      ).select('likesCount').lean();
      liked = false;
    }
    if (!product) return res.status(404).json({ error: 'Plat introuvable.' });
    return res.json({ success: true, liked, likesCount: Math.max(0, product.likesCount || 0) });
  } catch (_) {
    return res.status(500).json({ error: 'Impossible de mettre à jour le j’aime.' });
  }
});

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
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'products:read');
    if (!access) return;

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = buildProductFilter({
      companyId: access.company._id,
      search: req.query.q,
      status: req.query.status || 'active',
    });
    if (String(req.query.lowStock || '').toLowerCase() === 'true') {
      filter.$expr = { $lte: ['$stockOnHand', '$reorderPoint'] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      capabilities: {
        canCreate: access.isOwner || hasPermission(access.role, 'products:create'),
        canUpdate: access.isOwner || hasPermission(access.role, 'products:update'),
        canArchive: access.isOwner || hasPermission(access.role, 'products:archive'),
        canManageStock: access.isOwner || hasPermission(access.role, 'inventory:manage'),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger le catalogue produit.' });
  }
});

router.post('/company/:companyId', async (req, res) => {
  try {
    const access = await resolveCompanyPermission(req, res, req.params.companyId, 'products:create');
    if (!access) return;

    let input;
    try {
      input = normalizeProductInput(req.body);
    } catch (error) {
      return sendValidationError(res, error);
    }

    const product = await Product.create({
      ...input,
      companyId: access.company._id,
      createdBy: access.user._id,
      updatedBy: access.user._id,
    });
    if (product.isFeatured) {
      await Product.updateMany({ companyId: access.company._id, _id: { $ne: product._id }, isFeatured: true }, { isFeatured: false });
    }

    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'product.create',
      entityType: 'product',
      entityId: product._id,
      changedFields: Object.keys(input),
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Ce SKU existe déjà dans cette entreprise.' });
    return res.status(500).json({ error: 'Impossible de créer le produit.' });
  }
});

router.patch('/:productId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }
    const existing = await Product.findById(req.params.productId);
    if (!existing) return res.status(404).json({ error: 'Produit introuvable.' });

    const access = await resolveCompanyPermission(req, res, existing.companyId, 'products:update');
    if (!access) return;

    let input;
    try {
      input = normalizeProductInput(req.body, { partial: true });
    } catch (error) {
      return sendValidationError(res, error);
    }

    Object.assign(existing, input, { updatedBy: access.user._id });
    await existing.save();
    if (input.isFeatured === true) {
      await Product.updateMany({ companyId: existing.companyId, _id: { $ne: existing._id }, isFeatured: true }, { isFeatured: false });
    }
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'product.update',
      entityType: 'product',
      entityId: existing._id,
      changedFields: Object.keys(input),
    });
    return res.json({ success: true, data: existing });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Ce SKU existe déjà dans cette entreprise.' });
    return res.status(500).json({ error: 'Impossible de modifier le produit.' });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Produit introuvable.' });

    const access = await resolveCompanyPermission(req, res, product.companyId, 'products:archive');
    if (!access) return;

    product.status = 'archived';
    product.updatedBy = access.user._id;
    await product.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'product.archive',
      entityType: 'product',
      entityId: product._id,
      changedFields: ['status'],
    });
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible d’archiver le produit.' });
  }
});

router.get('/:productId/movements', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }
    const product = await Product.findById(req.params.productId).select('companyId');
    if (!product) return res.status(404).json({ error: 'Produit introuvable.' });

    const access = await resolveCompanyPermission(req, res, product.companyId, 'products:read');
    if (!access) return;

    const { page, limit } = normalizePagination(req.query.page, req.query.limit);
    const filter = { companyId: access.company._id, productId: product._id };
    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('actorId', 'name')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: movements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger l’historique de stock.' });
  }
});

router.post('/:productId/movements', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
    if (product.status !== 'active') return res.status(409).json({ error: 'Le produit est archivé.' });

    const access = await resolveCompanyPermission(req, res, product.companyId, 'inventory:manage');
    if (!access) return;

    let movementInput;
    try {
      movementInput = normalizeStockMovement(req.body);
    } catch (error) {
      return sendValidationError(res, error);
    }

    const stockFilter = { _id: product._id, companyId: access.company._id };
    if (movementInput.delta < 0) {
      stockFilter.stockOnHand = { $gte: Math.abs(movementInput.delta) };
    }

    const updatedProduct = await Product.findOneAndUpdate(
      stockFilter,
      { $inc: { stockOnHand: movementInput.delta }, $set: { updatedBy: access.user._id } },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) {
      return res.status(409).json({ error: 'Stock insuffisant pour cette sortie.' });
    }

    let movement;
    try {
      movement = await InventoryMovement.create({
        ...movementInput,
        companyId: access.company._id,
        productId: updatedProduct._id,
        actorId: access.user._id,
        balanceAfter: updatedProduct.stockOnHand,
      });
    } catch (error) {
      await Product.updateOne(
        { _id: updatedProduct._id, companyId: access.company._id },
        { $inc: { stockOnHand: -movementInput.delta } }
      );
      throw error;
    }

    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'inventory.movement',
      entityType: 'inventory_movement',
      entityId: movement._id,
      changedFields: ['stockOnHand', 'reason'],
    });

    return res.status(201).json({ success: true, data: { product: updatedProduct, movement } });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible d’enregistrer le mouvement de stock.' });
  }
});

module.exports = router;