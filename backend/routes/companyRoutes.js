const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const Company = require('../models/company');
const User = require('../models/User');
const AppointmentAppreciation = require('../models/AppointmentAppreciation');
const upload = require(path.join(__dirname, '../middleware/upload'));
const { mediaUpload } = require(path.join(__dirname, '../middleware/upload'));
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../services/firebaseAdmin');
const { storeUploadedFile } = require('../services/mediaStorage');

function hasRequiredCompanyContent(company) {
  const carouselCount = Array.isArray(company?.carouselImages) ? company.carouselImages.length : 0;
  const servicesCount = Array.isArray(company?.services) ? company.services.length : 0;
  return carouselCount >= 1 && servicesCount >= 2;
}

function isCompanyValidated(company) {
  const setupStatus = String(company?.setupStatus || '').toLowerCase();
  return (
    Boolean(company?.profileValidatedAt) ||
    setupStatus === 'ready' ||
    company?.isVerified === true
  );
}

function buildPublicCompanyVisibilityFilter() {
  return {
    $or: [
      { setupStatus: 'ready' },
      { profileValidatedAt: { $ne: null } },
      { isVerified: true },
      // Legacy compatibility: include potential public companies without explicit validation markers.
      { isDraft: { $ne: true } },
    ],
  };
}

function isCompanyPubliclyVisible(company) {
  if (!company || typeof company !== 'object') return false;
  const hasRequiredContent = hasRequiredCompanyContent(company);
  const validated = isCompanyValidated(company);

  // Legacy fallback: if validation markers are missing but content is ready, keep public visibility.
  if (!validated) {
    return company?.isDraft !== true && hasRequiredContent;
  }

  // Backward compatibility: legacy validated companies may not have complete content yet.
  if (company?.isVerified === true) return true;

  return hasRequiredContent;
}

async function resolveAuthenticatedOwnerId(req) {
  try {
    const rawAuth = req.headers?.authorization || '';
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : '';
    if (!token) return null;

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded?.uid) return null;

    const user = await User.findOne({ firebaseUid: decoded.uid }).select('_id').lean();
    return user?._id ? String(user._id) : null;
  } catch (_) {
    return null;
  }
}

/* ──────────────────────────────────────────────
   POST /companies/upload-temp → upload temporaire d'image
────────────────────────────────────────────── */
router.post('/upload-temp', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    const url = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });
    res.json({
      url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   POST /companies/:id/upload-image → upload d'image pour une entreprise existante
────────────────────────────────────────────── */
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    const url = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });
    res.json({
      url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   POST /companies/:id/upload-media → upload image/video pour une entreprise existante
────────────────────────────────────────────── */
router.post('/:id/upload-media', mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const mime = req.file?.mimetype || '';
    const resourceType = mime.startsWith('video/') ? 'video' : 'image';

    const url = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });

    res.json({
      url,
      resourceType,
      mime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   POST /companies → créer une entreprise
────────────────────────────────────────────── */
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    console.log('📤 POST /companies - Request received');
    console.log('   User UID:', req.user?.uid);
    console.log('   Body keys:', Object.keys(req.body));
    console.log('   Files:', req.files?.length || 0);

    const imagePaths = req.files
      ? await Promise.all(
          req.files.map((file) =>
            storeUploadedFile(file, {
              folder: 'goon/companies',
              localPrefix: '/uploads/',
            })
          )
        )
      : [];

    // Récupérer l'utilisateur connecté
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const ownerIdFromBody = String(req.body?.ownerId || req.body?.ownerid || '').trim();
    let resolvedOwnerId = user?._id;

    if (!resolvedOwnerId && ownerIdFromBody && mongoose.Types.ObjectId.isValid(ownerIdFromBody)) {
      resolvedOwnerId = ownerIdFromBody;
      console.warn('⚠️ Using ownerId fallback from request body for company creation:', ownerIdFromBody);
    }

    if (!resolvedOwnerId) {
      console.error('❌ User not found for UID and no valid ownerId fallback:', req.user.uid);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    console.log('✅ Owner resolved:', resolvedOwnerId);

    // Récupérer les données du formulaire
    const { 
      name, 
      description, 
      phone, 
      email, 
      website, 
      location, 
      categoryId, 
      categoryIds,
      logo,
      backgroundImage,
      latitude,
      longitude,
      locationAddress
    } = req.body;

    console.log('📝 Company name:', name);
    console.log('📍 Location:', location);
    console.log('🎨 Background Image:', backgroundImage ? '✓' : '✗');
    console.log('🗺️  Coordinates:', latitude, longitude);

    let parsedCategoryIds = [];
    if (Array.isArray(categoryIds)) {
      parsedCategoryIds = categoryIds;
    } else if (typeof categoryIds === 'string' && categoryIds.trim()) {
      try {
        const jsonParsed = JSON.parse(categoryIds);
        if (Array.isArray(jsonParsed)) {
          parsedCategoryIds = jsonParsed;
        } else {
          parsedCategoryIds = categoryIds.split(',');
        }
      } catch {
        parsedCategoryIds = categoryIds.split(',');
      }
    }

    const normalizedCategoryIds = [...new Set(
      parsedCategoryIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )];
    const primaryCategoryId = String(categoryId || normalizedCategoryIds[0] || '').trim();

    if (primaryCategoryId && !normalizedCategoryIds.includes(primaryCategoryId)) {
      normalizedCategoryIds.unshift(primaryCategoryId);
    }

    const company = await Company.create({
      name,
      description,
      phone,
      email,
      website,
      location: location || locationAddress,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      categoryId: primaryCategoryId,
      categoryIds: normalizedCategoryIds,
      // New companies always start private until validation/approval.
      isDraft: true,
      isVerified: false,
      setupStatus: 'draft',
      profileValidatedAt: null,
      ownerId: resolvedOwnerId,
      logo: logo || '',
      backgroundImage: backgroundImage || '',
      images: imagePaths,
      carouselImages: [],
      galleryImages: [],
      services: [],
    });

    console.log('✅ Company created:', company._id);
    console.log('✅ Company created:', company._id);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    console.error('❌ Create company error:', err.message);
    console.error('   Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   GET /companies → toutes les entreprises
────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const scope = String(req.query?.scope || '').trim().toLowerCase();
    const isPublicScope = !scope || scope === 'all';

    const visibilityMatch = buildPublicCompanyVisibilityFilter();
    const companies = await Company.find(visibilityMatch)
      .sort({ createdAt: -1 })
      .lean();

    const publicCompanies = isPublicScope
      ? companies.filter(isCompanyPubliclyVisible)
      : companies;

    if (!publicCompanies.length) {
      return res.json({ success: true, data: [] });
    }

    const companyIds = publicCompanies
      .map((company) => company?._id)
      .filter(Boolean);

    const aggregated = await AppointmentAppreciation.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      {
        $group: {
          _id: '$companyId',
          total: { $sum: 1 },
          likes: {
            $sum: {
              $cond: [{ $eq: ['$liked', true] }, 1, 0],
            },
          },
          dislikes: {
            $sum: {
              $cond: [{ $eq: ['$liked', false] }, 1, 0],
            },
          },
          ratingsSum: {
            $sum: {
              $cond: [{ $gt: ['$rating', 0] }, '$rating', 0],
            },
          },
          ratingsCount: {
            $sum: {
              $cond: [{ $gt: ['$rating', 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const summaryByCompanyId = new Map(
      aggregated.map((item) => {
        const averageRating = item.ratingsCount > 0
          ? Number((item.ratingsSum / item.ratingsCount).toFixed(2))
          : null;

        return [
          String(item._id),
          {
            total: item.total || 0,
            likes: item.likes || 0,
            dislikes: item.dislikes || 0,
            averageRating,
          },
        ];
      })
    );

    const data = publicCompanies.map((company) => ({
      ...company,
      appreciationSummary: summaryByCompanyId.get(String(company._id)) || {
        total: 0,
        likes: 0,
        dislikes: 0,
        averageRating: null,
      },
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   GET /companies/category/:id → par catégorie
────────────────────────────────────────────── */
router.get('/category/:id', async (req, res) => {
  try {
    const visibilityMatch = buildPublicCompanyVisibilityFilter();

    const companies = await Company.find({
      $and: [
        {
          $or: [
            { categoryId: req.params.id },
            { categoryIds: req.params.id },
          ],
        },
        visibilityMatch,
      ],
    }).lean();

    const publicCompanies = companies.filter(isCompanyPubliclyVisible);

    if (!publicCompanies.length) {
      return res.json([]);
    }

    const companyIds = publicCompanies
      .map((company) => company?._id)
      .filter(Boolean);

    const aggregated = await AppointmentAppreciation.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      {
        $group: {
          _id: '$companyId',
          total: { $sum: 1 },
          likes: {
            $sum: {
              $cond: [{ $eq: ['$liked', true] }, 1, 0],
            },
          },
          dislikes: {
            $sum: {
              $cond: [{ $eq: ['$liked', false] }, 1, 0],
            },
          },
          ratingsSum: {
            $sum: {
              $cond: [{ $gt: ['$rating', 0] }, '$rating', 0],
            },
          },
          ratingsCount: {
            $sum: {
              $cond: [{ $gt: ['$rating', 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const summaryByCompanyId = new Map(
      aggregated.map((item) => {
        const averageRating = item.ratingsCount > 0
          ? Number((item.ratingsSum / item.ratingsCount).toFixed(2))
          : null;

        return [
          String(item._id),
          {
            total: item.total || 0,
            likes: item.likes || 0,
            dislikes: item.dislikes || 0,
            averageRating,
          },
        ];
      })
    );

    const payload = publicCompanies.map((company) => ({
      ...company,
      appreciationSummary: summaryByCompanyId.get(String(company._id)) || {
        total: 0,
        likes: 0,
        dislikes: 0,
        averageRating: null,
      },
    }));

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   GET /companies/me → entreprise du propriétaire connecté
────────────────────────────────────────────── */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const company = await Company.findOne({ ownerId: user._id });
    if (!company) {
      return res.status(404).json({ error: 'Entreprise introuvable pour cet utilisateur' });
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   GET /companies/:id → une entreprise par ID
────────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const requesterOwnerId = await resolveAuthenticatedOwnerId(req);
    const company = await Company.findById(req.params.id)
      .populate('ownerId', 'name email avatar');
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    const companyOwnerId = String(company?.ownerId?._id || company?.ownerId || '');
    const isOwner = requesterOwnerId && String(requesterOwnerId) === companyOwnerId;
    const isPublic = isCompanyPubliclyVisible(company);

    if (!isOwner && !isPublic) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    const companyId = company._id;

    const [
      totalAppreciations,
      likes,
      dislikes,
      ratingAgg,
      recentComments,
    ] = await Promise.all([
      AppointmentAppreciation.countDocuments({ companyId }),
      AppointmentAppreciation.countDocuments({ companyId, liked: true }),
      AppointmentAppreciation.countDocuments({ companyId, liked: false }),
      AppointmentAppreciation.aggregate([
        { $match: { companyId, rating: { $type: 'number' } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      AppointmentAppreciation.find({
        companyId,
        comment: { $exists: true, $ne: '' },
      })
        .populate('reviewerId', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const averageRating = ratingAgg?.[0]?.avg
      ? Number(ratingAgg[0].avg.toFixed(2))
      : null;

    const payload = company.toObject();
    payload.appreciationSummary = {
      total: totalAppreciations,
      likes,
      dislikes,
      averageRating,
    };
    payload.appreciations = (recentComments || []).map((item) => ({
      _id: item._id,
      liked: item.liked,
      rating: typeof item.rating === 'number' ? item.rating : null,
      comment: item.comment || '',
      createdAt: item.createdAt,
      reviewer: {
        _id: item.reviewerId?._id || null,
        name: item.reviewerId?.name || 'Utilisateur',
        avatar: item.reviewerId?.avatar || '',
      },
    }));

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   PATCH /companies/:id → modifier une entreprise
────────────────────────────────────────────── */
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const authUser = await User.findOne({ firebaseUid: userId }).select('_id');
    if (!authUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Validation de l'ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID d\'entreprise invalide' });
    }

    // Vérifier la propriété
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (String(company.ownerId) !== String(authUser._id)) {
      console.warn(`⚠️ Accès refusé: Utilisateur ${userId} tente de modifier l'entreprise ${id} de ${company.ownerId}`);
      return res.status(403).json({ error: 'Accès refusé. Seul le propriétaire peut modifier cette entreprise.' });
    }

    // Construire le payload
    const payload = { ...req.body };

    // Valider et normaliser les champs modifiables
    const allowedFields = ['name', 'description', 'phone', 'email', 'website', 'location', 'categoryId', 'categoryIds', 'backgroundImage'];
    const filteredPayload = {};

    allowedFields.forEach((field) => {
      if (field in payload) {
        filteredPayload[field] = payload[field];
      }
    });

    // Traitement des catégories
    if (filteredPayload.categoryId !== undefined || filteredPayload.categoryIds !== undefined) {
      let parsedCategoryIds = [];
      if (Array.isArray(filteredPayload.categoryIds)) {
        parsedCategoryIds = filteredPayload.categoryIds;
      } else if (typeof filteredPayload.categoryIds === 'string' && filteredPayload.categoryIds.trim()) {
        try {
          const jsonParsed = JSON.parse(filteredPayload.categoryIds);
          parsedCategoryIds = Array.isArray(jsonParsed) ? jsonParsed : filteredPayload.categoryIds.split(',');
        } catch {
          parsedCategoryIds = filteredPayload.categoryIds.split(',');
        }
      }

      const normalizedCategoryIds = [...new Set(
        parsedCategoryIds
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )];

      const primaryCategoryId = String(filteredPayload.categoryId || normalizedCategoryIds[0] || '').trim();
      if (primaryCategoryId && !normalizedCategoryIds.includes(primaryCategoryId)) {
        normalizedCategoryIds.unshift(primaryCategoryId);
      }

      filteredPayload.categoryId = primaryCategoryId;
      filteredPayload.categoryIds = normalizedCategoryIds;
    }

    // Mettre à jour
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: filteredPayload },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ error: 'Impossible de mettre à jour l\'entreprise' });
    }

    console.log(`✅ Entreprise ${id} mise à jour par l'utilisateur ${userId}`);
    res.json(updatedCompany);
  } catch (err) {
    console.error('❌ Erreur PATCH /companies/:id', {
      error: err.message,
      userId: req.user?.uid,
      companyId: req.params.id,
    });
    res.status(500).json({
      error: 'Impossible de mettre à jour l\'entreprise. Veuillez réessayer.',
      code: 'PATCH_FAILED',
    });
  }
});

/* ──────────────────────────────────────────────
   DELETE /companies/:id → supprimer une entreprise
────────────────────────────────────────────── */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const authUser = await User.findOne({ firebaseUid: userId }).select('_id');
    if (!authUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Validation de l'ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID d\'entreprise invalide' });
    }

    // Rechercher l'entreprise
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    // Vérifier la propriété
    const ownerIdStr = String(company.ownerId);
    if (ownerIdStr !== String(authUser._id)) {
      console.warn(`⚠️ Accès refusé: Utilisateur ${userId} tente de supprimer l'entreprise ${id} de ${ownerIdStr}`);
      return res.status(403).json({ error: 'Accès refusé. Seul le propriétaire peut supprimer cette entreprise.' });
    }

    // Supprimer l'entreprise
    await Company.findByIdAndDelete(id);

    console.log(`✅ Entreprise ${id} (${company.name}) supprimée par l'utilisateur ${userId}`);
    res.json({
      success: true,
      message: 'Entreprise supprimée avec succès',
      deletedId: id,
    });
  } catch (err) {
    console.error('❌ Erreur DELETE /companies/:id', {
      error: err.message,
      userId: req.user?.uid,
      companyId: req.params.id,
    });
    res.status(500).json({
      error: 'Impossible de supprimer l\'entreprise. Veuillez réessayer.',
      code: 'DELETE_FAILED',
    });
  }
});

/* ══════════════════════════════════════════════
   SERVICES
══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   POST /companies/:id/services → ajouter un service
────────────────────────────────────────────── */
router.post('/:id/services', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    const { name, price, image, video, description } = req.body;
    company.services.push({ name, price, image, video, description });
    await company.save();

    const newService = company.services[company.services.length - 1];
    res.status(201).json(newService);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   PATCH /companies/:id/services/:serviceId → modifier un service
────────────────────────────────────────────── */
router.patch('/:id/services/:serviceId', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    const service = company.services.id(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service introuvable' });

    const { name, price, image, video, description } = req.body;
    if (name !== undefined) service.name = name;
    if (price !== undefined) service.price = price;
    if (image !== undefined) service.image = image;
    if (video !== undefined) service.video = video;
    if (description !== undefined) service.description = description;

    await company.save();
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   DELETE /companies/:id/services/:serviceId → supprimer un service
────────────────────────────────────────────── */
router.delete('/:id/services/:serviceId', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    company.services = company.services.filter(
      s => s._id.toString() !== req.params.serviceId
    );

    await company.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;