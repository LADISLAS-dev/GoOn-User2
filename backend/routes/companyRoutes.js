const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const Company = require('../models/company');
const BusinessType = require('../models/BusinessType');
const Employee = require('../models/Employee');
const {
  buildCompanyModuleAssignments,
  buildDefaultModuleAssignmentsFromDatabase,
  getCompanyModules,
} = require('../services/businessModuleService');
const User = require('../models/User');
const { hasPermission, resolveCompanyAccess } = require('../services/rbacService');
const { logAuditEvent } = require('../services/auditLogService');
const AppointmentAppreciation = require('../models/AppointmentAppreciation');
const upload = require(path.join(__dirname, '../middleware/upload'));
const { mediaUpload } = require(path.join(__dirname, '../middleware/upload'));
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../services/firebaseAdmin');
const { storeUploadedFile } = require('../services/mediaStorage');

function toAbsoluteMediaUrl(req, url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  if (!host) return raw;

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${proto}://${host}${normalizedPath}`;
}

async function resolveAuthenticatedOwnerId(req) {
  const user = await User.findOne({ firebaseUid: req.user?.uid }).select('_id');
  return user?._id || null;
}

// Résout l'id du propriétaire à partir du token (sans authMiddleware).
// Retourne null si pas de token / token invalide / utilisateur inconnu.
async function resolveOwnerIdFromToken(req) {
  const raw = req.headers.authorization;
  const token = raw?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid }).select('_id');
    return user?._id || null;
  } catch (_) {
    return null;
  }
}

async function resolveOwnedCompany(req, companyId) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return { error: { status: 400, message: 'ID d\'entreprise invalide' } };
  }

  const ownerId = await resolveAuthenticatedOwnerId(req);
  if (!ownerId) {
    return { error: { status: 404, message: 'Utilisateur introuvable' } };
  }

  const company = await Company.findById(companyId);
  if (!company) {
    return { error: { status: 404, message: 'Entreprise non trouvée' } };
  }

  if (String(company.ownerId) !== String(ownerId)) {
    return {
      error: {
        status: 403,
        message: 'Accès refusé. Seul le propriétaire peut modifier cette entreprise.',
      },
    };
  }

  return { company, ownerId };
}

function buildPublicCompanyVisibilityFilter() {
  return {
    $or: [
      { setupStatus: 'ready' },
      { profileValidatedAt: { $ne: null } },
    ],
  };
}

/* ──────────────────────────────────────────────
   POST /companies/upload-temp → upload temporaire d'image
────────────────────────────────────────────── */
router.post('/upload-temp', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    const storedUrl = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });
    const url = toAbsoluteMediaUrl(req, storedUrl);

    // In production, local filesystem URLs are not durable across restarts.
    if (process.env.NODE_ENV === 'production' && String(storedUrl || '').startsWith('/uploads/')) {
      return res.status(500).json({
        error: 'Stockage media indisponible en mode persistant. Verifiez la configuration Cloudinary.',
        code: 'MEDIA_PERSISTENCE_NOT_CONFIGURED',
      });
    }

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
router.post('/:id/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const owned = await resolveOwnedCompany(req, req.params.id);
    if (owned.error) {
      return res.status(owned.error.status).json({ error: owned.error.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    const storedUrl = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });
    const url = toAbsoluteMediaUrl(req, storedUrl);

    // In production, local filesystem URLs are not durable across restarts.
    if (process.env.NODE_ENV === 'production' && String(storedUrl || '').startsWith('/uploads/')) {
      return res.status(500).json({
        error: 'Stockage media indisponible en mode persistant. Verifiez la configuration Cloudinary.',
        code: 'MEDIA_PERSISTENCE_NOT_CONFIGURED',
      });
    }

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
router.post('/:id/upload-media', authMiddleware, mediaUpload.single('media'), async (req, res) => {
  try {
    const owned = await resolveOwnedCompany(req, req.params.id);
    if (owned.error) {
      return res.status(owned.error.status).json({ error: owned.error.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const mime = req.file?.mimetype || '';
    const resourceType = mime.startsWith('video/') ? 'video' : 'image';

    const storedUrl = await storeUploadedFile(req.file, {
      folder: 'goon/companies',
      localPrefix: '/uploads/',
    });
    const url = toAbsoluteMediaUrl(req, storedUrl);

    // In production, local filesystem URLs are not durable across restarts.
    if (process.env.NODE_ENV === 'production' && String(storedUrl || '').startsWith('/uploads/')) {
      return res.status(500).json({
        error: 'Stockage media indisponible en mode persistant. Verifiez la configuration Cloudinary.',
        code: 'MEDIA_PERSISTENCE_NOT_CONFIGURED',
      });
    }

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

    // Récupérer (ou créer) l'utilisateur connecté pour garantir un ownerId cohérent.
    let user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      const fallbackName = String(req.user?.name || 'User').trim() || 'User';
      const fallbackEmail = String(
        req.user?.email || `${req.user.uid}@firebase.local`
      ).trim().toLowerCase();

      user = await User.findOneAndUpdate(
        { firebaseUid: req.user.uid },
        {
          $setOnInsert: {
            firebaseUid: req.user.uid,
            name: fallbackName,
            email: fallbackEmail,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: false,
          setDefaultsOnInsert: true,
        }
      );
      console.warn('⚠️ Auto-created missing user profile for company owner:', req.user.uid);
    }

    const resolvedOwnerId = user?._id;
    if (!resolvedOwnerId) {
      console.error('❌ Owner resolution failed for UID:', req.user.uid);
      return res.status(500).json({ error: 'Impossible de resoudre le proprietaire' });
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
      businessTypeId,
      isVerified, 
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
    const requestedBusinessTypeId = String(businessTypeId || '').trim();

    if (requestedBusinessTypeId) {
      const businessType = await BusinessType.exists({ key: requestedBusinessTypeId, active: true });
      if (!businessType) {
        return res.status(400).json({ error: 'Domaine d’activité inconnu ou désactivé.' });
      }
    }

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
      businessTypeId: requestedBusinessTypeId || '',
      categoryId: primaryCategoryId,
      categoryIds: normalizedCategoryIds,
      enabledModules: await buildDefaultModuleAssignmentsFromDatabase(normalizedCategoryIds),
      isVerified: isVerified === 'true' || isVerified === true,
      ownerId: resolvedOwnerId,
      setupStatus: 'draft',
      profileValidatedAt: null,
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
    const scope = String(req.query?.scope || '').toLowerCase();
    const compact = ['1', 'true', 'yes'].includes(String(req.query?.compact || '').toLowerCase());
    if (scope === 'owned') {
      // Entreprises appartenant à l'utilisateur connecté (y compris brouillons)
      const raw = req.headers.authorization;
      const token = raw?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      let uid;
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      const user = await User.findOne({ firebaseUid: uid });
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      const ownedQuery = Company.find({ ownerId: user._id }).sort({ createdAt: -1 });
      if (compact) {
        ownedQuery.select('_id name logo ownerId createdAt');
      }
      const ownedData = await ownedQuery.lean();
      return res.json({ success: true, data: ownedData });
    }
    if (scope === 'all') {
      const companyQuery = Company.find(buildPublicCompanyVisibilityFilter()).sort({ createdAt: -1 });
      if (compact) {
        companyQuery.select('_id name logo ownerId createdAt');
      }

      const companies = await companyQuery.lean();
      const companyIds = companies
        .map((company) => company?._id)
        .filter(Boolean);

      if (!companyIds.length) {
        return res.json({ success: true, data: [] });
      }

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

      const data = companies.map((company) => {
        const appreciationSummary = summaryByCompanyId.get(String(company._id)) || {
          total: 0,
          likes: 0,
          dislikes: 0,
          averageRating: null,
        };

        if (compact) {
          return {
            _id: company._id,
            name: company.name,
            logo: company.logo,
            ownerId: company.ownerId,
            createdAt: company.createdAt,
            appreciationSummary,
          };
        }

        return {
          ...company,
          appreciationSummary,
        };
      });

      return res.json({ success: true, data });
    }

    // Sans scope → retourne toutes les entreprises publiques
    const allQuery = Company.find(buildPublicCompanyVisibilityFilter()).sort({ createdAt: -1 });
    if (compact) {
      allQuery.select('_id name logo ownerId createdAt');
    }

    const data = await allQuery.lean();
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
    const companies = await Company.find({
      ...buildPublicCompanyVisibilityFilter(),
      $or: [
        { categoryId: req.params.id },
        { categoryIds: req.params.id },
      ],
    }).lean();

    if (!companies.length) {
      return res.json([]);
    }

    const companyIds = companies
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

    const payload = companies.map((company) => ({
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

    let company = await Company.findOne({ ownerId: user._id });
    if (!company) {
      const membership = await Employee.findOne({ userId: user._id, status: 'active' })
        .sort({ createdAt: 1 })
        .select('companyId');
      if (membership) company = await Company.findById(membership.companyId);
    }
    if (!company) {
      return res.status(404).json({ error: 'Aucune entreprise accessible pour cet utilisateur.' });
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────
   GET /companies/:id → une entreprise par ID
────────────────────────────────────────────── */
router.get('/:id/modules', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }

    const access = await resolveCompanyAccess({
      firebaseUid: req.user?.uid,
      companyId: req.params.id,
      permission: 'modules:read',
    });
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const modules = await getCompanyModules(access.company, access);
    return res.json({
      success: true,
      data: modules,
      canManage: access.isOwner || hasPermission(access.role, 'modules:manage'),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/modules', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    }

    const access = await resolveCompanyAccess({
      firebaseUid: req.user?.uid,
      companyId: req.params.id,
      permission: 'modules:manage',
    });
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    if (!Array.isArray(req.body?.modules)) {
      return res.status(400).json({ error: 'La liste des modules est invalide.' });
    }

    const { assignments, unknownKeys } = buildCompanyModuleAssignments(req.body.modules);
    if (unknownKeys.length) {
      return res.status(400).json({
        error: 'Un ou plusieurs modules ne sont pas disponibles.',
        unknownModules: unknownKeys,
      });
    }

    access.company.enabledModules = assignments;
    await access.company.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'module.update',
      entityType: 'business_module',
      entityId: access.company._id,
      changedFields: ['enabledModules'],
    });

    const modules = await getCompanyModules(access.company, access);
    return res.json({
      success: true,
      data: modules,
      canManage: access.isOwner || hasPermission(access.role, 'modules:manage'),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const requesterOwnerId = await resolveOwnerIdFromToken(req);
    const company = await Company.findById(req.params.id)
      .populate('ownerId', 'name email avatar');
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    const companyOwnerId = String(company?.ownerId?._id || company?.ownerId || '');
    const isOwner = requesterOwnerId && String(requesterOwnerId) === companyOwnerId;
    const isPubliclyVisible =
      company.setupStatus === 'ready' ||
      Boolean(company.profileValidatedAt);
    const isActiveEmployee = requesterOwnerId && !isOwner
      ? Boolean(await Employee.exists({
          companyId: company._id,
          userId: requesterOwnerId,
          status: 'active',
        }))
      : false;

    if (!isOwner && !isActiveEmployee && !isPubliclyVisible) {
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

    // Validation de l'ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID d\'entreprise invalide' });
    }

    // Vérifier la propriété
    // Ne pas dépendre de populate() ici: si la relation User est incomplète,
    // populate peut masquer ownerId et provoquer des faux "access denied".
    const company = await Company.findById(id).select('ownerId');
    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const ownerObjectId = String(company?.ownerId || '');
    let ownerFirebaseUid = '';

    if (company?.ownerId) {
      const ownerUser = await User.findById(company.ownerId).select('firebaseUid');
      ownerFirebaseUid = String(ownerUser?.firebaseUid || '');
    }

    let isOwner = ownerFirebaseUid && ownerFirebaseUid === String(userId);

    if (!isOwner) {
      const authUser = await User.findOne({ firebaseUid: userId }).select('_id');
      isOwner = !!authUser && String(authUser._id) === ownerObjectId;
    }

    if (!isOwner) {
      console.warn(`⚠️ Accès refusé: Utilisateur ${userId} tente de modifier l'entreprise ${id} de ${company.ownerId}`);
      return res.status(403).json({ error: 'Accès refusé. Seul le propriétaire peut modifier cette entreprise.' });
    }

    // Construire le payload
    const payload = { ...req.body };

    // Backward compatibility with legacy clients sending `images` for gallery.
    if (payload.galleryImages === undefined && Array.isArray(payload.images)) {
      payload.galleryImages = payload.images;
    }

    // Valider et normaliser les champs modifiables
    const allowedFields = [
      'name',
      'description',
      'phone',
      'email',
      'website',
      'location',
      'categoryId',
      'categoryIds',
      'logo',
      'backgroundImage',
      'carouselImages',
      'galleryImages',
      'services',
      'setupStatus',
      'profileValidatedAt',
    ];
    const filteredPayload = {};

    allowedFields.forEach((field) => {
      if (field in payload) {
        filteredPayload[field] = payload[field];
      }
    });

    // Normalize media arrays to avoid malformed payloads replacing data unexpectedly.
    if (filteredPayload.carouselImages !== undefined) {
      filteredPayload.carouselImages = Array.isArray(filteredPayload.carouselImages)
        ? filteredPayload.carouselImages.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    }

    if (filteredPayload.galleryImages !== undefined) {
      filteredPayload.galleryImages = Array.isArray(filteredPayload.galleryImages)
        ? filteredPayload.galleryImages.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    }

    if (process.env.DEBUG_MEDIA === 'true') {
      console.log('[company patch debug]', {
        companyId: id,
        bodyKeys: Object.keys(payload || {}),
        filteredKeys: Object.keys(filteredPayload || {}),
        galleryCount: Array.isArray(filteredPayload.galleryImages) ? filteredPayload.galleryImages.length : null,
        carouselCount: Array.isArray(filteredPayload.carouselImages) ? filteredPayload.carouselImages.length : null,
      });
    }

    if (!Object.keys(filteredPayload).length) {
      return res.status(400).json({
        error: 'Aucun champ modifiable fourni',
        code: 'NO_MUTABLE_FIELDS',
      });
    }

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

    // Visibility workflow normalization.
    // Frontend validates with setupStatus="ready" and profileValidatedAt set.
    if (filteredPayload.setupStatus !== undefined || filteredPayload.profileValidatedAt !== undefined) {
      const normalizedSetupStatus = String(filteredPayload.setupStatus || '').trim().toLowerCase();
      const hasValidationDate =
        filteredPayload.profileValidatedAt !== null &&
        String(filteredPayload.profileValidatedAt || '').trim() !== '';

      if (normalizedSetupStatus === 'ready' || hasValidationDate) {
        filteredPayload.setupStatus = 'ready';
        filteredPayload.profileValidatedAt = hasValidationDate
          ? new Date(filteredPayload.profileValidatedAt)
          : new Date();
        filteredPayload.isDraft = false;
      } else {
        filteredPayload.setupStatus = 'draft';
        filteredPayload.profileValidatedAt = null;
        filteredPayload.isDraft = true;
      }
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
router.post('/:id/services', authMiddleware, async (req, res) => {
  try {
    const owned = await resolveOwnedCompany(req, req.params.id);
    if (owned.error) {
      return res.status(owned.error.status).json({ error: owned.error.message });
    }
    const company = owned.company;

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
router.patch('/:id/services/:serviceId', authMiddleware, async (req, res) => {
  try {
    const owned = await resolveOwnedCompany(req, req.params.id);
    if (owned.error) {
      return res.status(owned.error.status).json({ error: owned.error.message });
    }
    const company = owned.company;

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
router.delete('/:id/services/:serviceId', authMiddleware, async (req, res) => {
  try {
    const owned = await resolveOwnedCompany(req, req.params.id);
    if (owned.error) {
      return res.status(owned.error.status).json({ error: owned.error.message });
    }
    const company = owned.company;

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