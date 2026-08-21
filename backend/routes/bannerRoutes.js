const express = require('express');
const router = express.Router();

const Banner = require('../models/Banner');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { mediaUpload } = require('../middleware/upload');
const { storeUploadedFile } = require('../services/mediaStorage');

const sanitizeBg = (bg) => {
  if (!Array.isArray(bg)) return undefined;
  const clean = bg
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .slice(0, 2);
  return clean.length >= 2 ? clean : undefined;
};

const normalizeBanner = (banner) => ({
  _id: String(banner._id),
  ownerId: banner.ownerId,
  title: banner.title,
  subtitle: banner.subtitle || '',
  description: banner.description || '',
  price: banner.price || '',
  ctaLabel: banner.ctaLabel || 'Voir',
  ctaUrl: banner.ctaUrl || '',
  mediaUrl: banner.mediaUrl || '',
  mediaType: banner.mediaType || 'none',
  bg: Array.isArray(banner.bg) && banner.bg.length >= 2 ? banner.bg : ['#2D1B69', '#7B2FBE'],
  isActive: banner.isActive !== false,
  createdAt: banner.createdAt,
  updatedAt: banner.updatedAt,
});

async function getCurrentMongoUser(req) {
  if (!req.user?.uid) return null;
  return User.findOne({ firebaseUid: req.user.uid });
}

router.post('/upload-media', authMiddleware, mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun media reçu' });
    }

    const url = await storeUploadedFile(req.file, {
      folder: 'goon/banners',
      localPrefix: '/uploads/',
    });

    const mime = String(req.file.mimetype || '');
    const mediaType = mime.startsWith('video/') ? 'video' : 'image';

    return res.json({
      url,
      mediaType,
      mime,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await Banner.find({ isActive: true })
      .populate('ownerId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ banners: data.map(normalizeBanner) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const payload = {
      ownerId: currentUser._id,
      title,
      subtitle: String(req.body?.subtitle || '').trim(),
      description: String(req.body?.description || '').trim(),
      price: String(req.body?.price || '').trim(),
      ctaLabel: String(req.body?.ctaLabel || 'Voir').trim() || 'Voir',
      ctaUrl: String(req.body?.ctaUrl || '').trim(),
      mediaUrl: String(req.body?.mediaUrl || '').trim(),
      mediaType: String(req.body?.mediaType || '').trim() || 'none',
      isActive: req.body?.isActive !== false,
    };

    const bg = sanitizeBg(req.body?.bg);
    if (bg) payload.bg = bg;

    const created = await Banner.create(payload);
    const populated = await Banner.findById(created._id).populate('ownerId', 'name email avatar');

    return res.status(201).json(normalizeBanner(populated));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    if (String(banner.ownerId) !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Forbidden: you can edit only your banners' });
    }

    const nextTitle = req.body?.title !== undefined ? String(req.body.title || '').trim() : banner.title;
    if (!nextTitle) {
      return res.status(400).json({ error: 'title is required' });
    }

    banner.title = nextTitle;
    if (req.body?.subtitle !== undefined) banner.subtitle = String(req.body.subtitle || '').trim();
    if (req.body?.description !== undefined) banner.description = String(req.body.description || '').trim();
    if (req.body?.price !== undefined) banner.price = String(req.body.price || '').trim();
    if (req.body?.ctaLabel !== undefined) banner.ctaLabel = String(req.body.ctaLabel || '').trim() || 'Voir';
    if (req.body?.ctaUrl !== undefined) banner.ctaUrl = String(req.body.ctaUrl || '').trim();
    if (req.body?.mediaUrl !== undefined) banner.mediaUrl = String(req.body.mediaUrl || '').trim();
    if (req.body?.mediaType !== undefined) {
      const nextMediaType = String(req.body.mediaType || '').trim();
      if (['image', 'video', 'none'].includes(nextMediaType)) {
        banner.mediaType = nextMediaType;
      }
    }
    if (req.body?.isActive !== undefined) banner.isActive = req.body.isActive !== false;

    const bg = sanitizeBg(req.body?.bg);
    if (bg) banner.bg = bg;

    await banner.save();

    const populated = await Banner.findById(banner._id).populate('ownerId', 'name email avatar');
    return res.json(normalizeBanner(populated));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    if (String(banner.ownerId) !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Forbidden: you can delete only your banners' });
    }

    await Banner.deleteOne({ _id: banner._id });
    return res.json({ success: true, deletedId: String(banner._id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
