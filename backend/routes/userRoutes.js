const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const DeletedAccount = require('../models/DeletedAccount');
const Company = require('../models/company');
const Banner = require('../models/Banner');
const Appointment = require('../models/Appointment');
const AppointmentAppreciation = require('../models/AppointmentAppreciation');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../services/firebaseAdmin');
const upload = require('../middleware/upload');
const { storeUploadedFile } = require('../services/mediaStorage');
const {
  UPLOADS_URL_PREFIX,
  normalizeAvatarValue,
  buildBootstrapPatch,
} = require('../utils/profilePersistence');
const { normalizeLanguage } = require('../utils/notificationLocalization');
const { selectPreferredPushTokens } = require('../utils/pushTokenSelection');
const { isValidExpoPushToken, sendExpoPushNotifications } = require('../utils/expoPush');

const DEFAULT_NOTIFICATION_PREFERENCES = {
  masterEnabled: true,
  allowMessages: true,
  allowBookings: true,
  allowGeneral: true,
  bannerEnabled: true,
  soundEnabled: true,
  badgeEnabled: true,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  pollingIntervalSec: 8,
  digestEnabled: false,
  digestIntervalHours: 4,
  digestLastSentAt: null,
};

function normalizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function sanitizeNotificationPreferences(raw = {}) {
  const merged = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw && typeof raw === 'object' ? raw : {}),
  };

  return {
    masterEnabled: Boolean(merged.masterEnabled),
    allowMessages: Boolean(merged.allowMessages),
    allowBookings: Boolean(merged.allowBookings),
    allowGeneral: Boolean(merged.allowGeneral),
    bannerEnabled: Boolean(merged.bannerEnabled),
    soundEnabled: Boolean(merged.soundEnabled),
    badgeEnabled: Boolean(merged.badgeEnabled),
    quietHoursEnabled: Boolean(merged.quietHoursEnabled),
    quietStart: normalizeTime(merged.quietStart, DEFAULT_NOTIFICATION_PREFERENCES.quietStart),
    quietEnd: normalizeTime(merged.quietEnd, DEFAULT_NOTIFICATION_PREFERENCES.quietEnd),
    pollingIntervalSec: Math.max(5, Math.min(120, Number(merged.pollingIntervalSec || 8))),
    digestEnabled: Boolean(merged.digestEnabled),
    digestIntervalHours: Math.max(1, Math.min(24, Number(merged.digestIntervalHours || 4))),
    digestLastSentAt: merged.digestLastSentAt || null,
  };
}

function buildPushRegistrations(currentUser, token, pushContext = {}) {
  const currentRegistrations = Array.isArray(currentUser?.expoPushRegistrations)
    ? currentUser.expoPushRegistrations
    : [];

  const filtered = currentRegistrations.filter((entry) => entry?.token !== token);
  filtered.push({
    token,
    appOwnership: typeof pushContext?.appOwnership === 'string' ? pushContext.appOwnership : null,
    executionEnvironment:
      typeof pushContext?.executionEnvironment === 'string'
        ? pushContext.executionEnvironment
        : null,
    updatedAt: new Date(),
  });

  return filtered;
}

function isLegacyExponentToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

function isModernExpoToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExpoPushToken[');
}

function isStandaloneContext(pushContext = {}) {
  const ownership = String(pushContext?.appOwnership || '').toLowerCase();
  const environment = String(pushContext?.executionEnvironment || '').toLowerCase();
  return ownership === 'standalone' || environment === 'standalone' || environment === 'bare';
}

function isLocalUploadPath(value = '') {
  return typeof value === 'string' && value.includes(UPLOADS_URL_PREFIX);
}

function tryDeleteLocalAvatar(avatarUrl) {
  if (!isLocalUploadPath(avatarUrl)) return;

  try {
    const start = avatarUrl.indexOf(UPLOADS_URL_PREFIX);
    const relativePath = avatarUrl.slice(start + 1);
    const absolutePath = path.join(__dirname, '..', relativePath);
    fs.unlink(absolutePath, () => {});
  } catch (_) {
    // best effort cleanup only
  }
}

function tryDeleteLocalMedia(value) {
  if (!isLocalUploadPath(value)) return;

  try {
    const start = value.indexOf(UPLOADS_URL_PREFIX);
    const relativePath = value.slice(start + 1);
    const absolutePath = path.join(__dirname, '..', relativePath);
    fs.unlink(absolutePath, () => {});
  } catch (_) {
    // best effort cleanup only
  }
}

function buildNonEmptyOrFilters(filters = []) {
  return filters.filter(Boolean);
}

function hashEmail(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  const salt = String(process.env.DELETED_ACCOUNT_EMAIL_SALT || 'goon-deleted-account-salt');
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalized}`)
    .digest('hex');
}

function buildDeletedAccountQuery(firebaseUid = '', email = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailHash = hashEmail(normalizedEmail);

  return {
    $or: [
      { firebaseUid },
      ...(emailHash ? [{ emailHash }] : []),
      // Backward compatibility for legacy markers saved with plain email.
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ],
  };
}

async function upsertDeletedAccountMarker(firebaseUid, email = '') {
  if (!firebaseUid) return;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailHash = hashEmail(normalizedEmail);
  return DeletedAccount.findOneAndUpdate(
    { firebaseUid },
    {
      $set: {
        firebaseUid,
        email: '',
        emailHash,
        reason: 'user_request',
        deletedAt: new Date(),
      },
      $setOnInsert: {
        firebaseDeletedAt: null,
        firebaseDeleteAttempts: 0,
        firebaseDeleteLastAttemptAt: null,
        firebaseDeleteLastError: '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function enforceFirebaseAccountRevocation(firebaseUid, markerId = null) {
  const touchAttempt = async (errorMessage = '') => {
    if (!markerId) return;
    await DeletedAccount.updateOne(
      { _id: markerId },
      {
        $inc: { firebaseDeleteAttempts: 1 },
        $set: {
          firebaseDeleteLastAttemptAt: new Date(),
          firebaseDeleteLastError: String(errorMessage || ''),
        },
      }
    );
  };

  try {
    await touchAttempt('');
    await admin.auth().deleteUser(firebaseUid);
    if (markerId) {
      await DeletedAccount.updateOne(
        { _id: markerId },
        {
          $set: {
            firebaseDeletedAt: new Date(),
            firebaseDeleteLastError: '',
          },
        }
      );
    }
    return { deleted: true, disabled: false };
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      if (markerId) {
        await DeletedAccount.updateOne(
          { _id: markerId },
          {
            $set: {
              firebaseDeletedAt: new Date(),
              firebaseDeleteLastError: '',
            },
          }
        );
      }
      return { deleted: true, disabled: false };
    }

    console.error('Delete account firebase error:', error);
    await touchAttempt(error?.message || error?.code || 'delete-failed');

    // Strong fallback: disable the account to block any future sign-in.
    try {
      await admin.auth().updateUser(firebaseUid, { disabled: true });
      if (markerId) {
        await DeletedAccount.updateOne(
          { _id: markerId },
          {
            $set: {
              firebaseDeleteLastError: 'hard-delete-pending-disabled',
            },
          }
        );
      }
      return { deleted: false, disabled: true };
    } catch (disableError) {
      console.error('Delete account firebase disable fallback error:', disableError);
      await touchAttempt(disableError?.message || disableError?.code || 'disable-failed');
      return { deleted: false, disabled: false };
    }
  }
}

async function isFirebaseUserActive(firebaseUid) {
  try {
    await admin.auth().getUser(firebaseUid);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return false;
    }

    throw error;
  }
}

// GET ALL USERS (authenticated, sanitized profile fields)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('_id firebaseUid name avatar bio language lastActiveAt createdAt updatedAt')
      .lean();

    const sanitizedUsers = users.map((user) => ({
      ...user,
      avatar: normalizeAvatarValue(user?.avatar || ''),
    }));

    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Get users list error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE OR UPDATE USER PROFILE
router.post('/', authMiddleware, upload.single('avatarFile'), async (req, res) => {
  try {
    const { firebaseUid, name, email, expoPushToken, avatar, bio, language } = req.body;
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanBio = typeof bio === 'string' ? bio : undefined;
    const cleanLanguage = normalizeLanguage(language, '');
    const normalizedPushToken =
      typeof expoPushToken === 'string' && expoPushToken.trim().length > 0
        ? expoPushToken.trim()
        : null;

    if (!firebaseUid || !cleanName || !cleanEmail) {
      return res.status(400).json({
        error: 'Missing required fields: firebaseUid, name and email are required',
      });
    }

    if (firebaseUid !== req.user.uid) {
      return res.status(403).json({
        error: 'Authenticated user does not match provided firebaseUid',
      });
    }

    const deletedMarker = await DeletedAccount.findOne(buildDeletedAccountQuery(firebaseUid, cleanEmail))
      .select('_id')
      .lean();
    if (deletedMarker) {
      return res.status(403).json({ error: 'Account deleted', code: 'ACCOUNT_DELETED' });
    }

    if (normalizedPushToken) {
      try {
        // Best effort only: bootstrap profile creation must not fail because of push token churn.
        await User.updateMany(
          {
            firebaseUid: { $ne: firebaseUid },
            $or: [
              { expoPushToken: normalizedPushToken },
              { expoPushTokens: normalizedPushToken },
            ],
          },
          {
            $set: { expoPushToken: null },
            $pull: { expoPushTokens: normalizedPushToken },
          }
        );
      } catch (tokenError) {
        console.warn('POST /users push token reassignment warning:', tokenError?.message);
      }
    }

    const uploadedAvatarUrl = req.file
      ? await storeUploadedFile(req.file, {
          folder: 'goon/avatars',
          localPrefix: UPLOADS_URL_PREFIX,
        })
      : null;

    const existingUser = await User.findOne({ firebaseUid });
    const existingByEmail = existingUser
      ? null
      : await User.findOne({ email: cleanEmail });

    // Keep bootstrap POST idempotent: do not overwrite an already-filled profile.
    if (existingUser) {
      const patch = buildBootstrapPatch(existingUser, {
        cleanName,
        cleanEmail,
        cleanBio,
        cleanLanguage,
        avatar,
        uploadedAvatarUrl,
        normalizedPushToken,
      });

      if (uploadedAvatarUrl && existingUser?.avatar) {
        tryDeleteLocalAvatar(existingUser.avatar);
      }

      if (!Object.keys(patch).length) {
        return res.status(200).json(existingUser);
      }

      const preserved = await User.findOneAndUpdate(
        { firebaseUid },
        { $set: patch },
        { new: true, runValidators: false }
      );

      return res.status(200).json(preserved || existingUser);
    }

    // If an existing profile already owns this email, re-link it to the current Firebase UID
    // instead of attempting an insert that would violate a unique email index.
    if (existingByEmail) {
      const patch = buildBootstrapPatch(existingByEmail, {
        cleanName,
        cleanEmail,
        cleanBio,
        cleanLanguage,
        avatar,
        uploadedAvatarUrl,
        normalizedPushToken,
      });

      const relinked = await User.findByIdAndUpdate(
        existingByEmail._id,
        {
          $set: {
            firebaseUid,
            ...patch,
          },
        },
        { new: true, runValidators: false }
      );

      return res.status(200).json(relinked || existingByEmail);
    }

    const update = {
      firebaseUid,
      name: cleanName,
      email: cleanEmail,
      ...(typeof cleanBio === 'string' ? { bio: cleanBio } : {}),
      ...(cleanLanguage ? { language: cleanLanguage } : {}),
      ...(normalizedPushToken
        ? { expoPushToken: normalizedPushToken, expoPushTokens: [normalizedPushToken] }
        : {}),
    };

    if (uploadedAvatarUrl) {
      update.avatar = uploadedAvatarUrl;
    } else if (typeof avatar === 'string') {
      update.avatar = normalizeAvatarValue(avatar);
    }

    // Keep $setOnInsert strictly for fields not already present in $set.
    // This prevents Mongo path conflicts when upsert happens concurrently.
    const setOnInsert = {
      expoPushToken: null,
      expoPushTokens: [],
    };
    if (!uploadedAvatarUrl && typeof avatar !== 'string') {
      setOnInsert.avatar = '';
    }
    if (typeof cleanBio !== 'string') {
      setOnInsert.bio = '';
    }

    const updateDoc = { $set: update };
    if (Object.keys(setOnInsert).length > 0) {
      updateDoc.$setOnInsert = setOnInsert;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      updateDoc,
      {
        new: true,
        upsert: true,
        runValidators: false,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json(user);
  } catch (error) {
    const fbUid = req.body?.firebaseUid;
    const cleanLanguage = normalizeLanguage(req.body?.language, '');
    try {
      const existingUser = await User.findOne({ firebaseUid: fbUid });
      if (existingUser) {
        return res.status(200).json(existingUser);
      }
    } catch (_) {
      // continue to fallback below
    }

    try {
      if (fbUid && req.body?.name && req.body?.email) {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (email) {
          const existingByEmail = await User.findOne({ email });
          if (existingByEmail) {
            const relinked = await User.findByIdAndUpdate(
              existingByEmail._id,
              { $set: { firebaseUid: fbUid, name: req.body.name, ...(cleanLanguage ? { language: cleanLanguage } : {}) } },
              { new: true, runValidators: false }
            );
            if (relinked) {
              return res.status(200).json(relinked);
            }
          }
        }

        const minimalUser = await User.findOneAndUpdate(
          { firebaseUid: fbUid },
          {
            $set: {
              firebaseUid: fbUid,
              name: req.body.name,
              email,
              ...(cleanLanguage ? { language: cleanLanguage } : {}),
            },
          },
          { new: true, upsert: true, runValidators: false, setDefaultsOnInsert: true }
        );

        if (minimalUser) {
          return res.status(200).json(minimalUser);
        }
      }
    } catch (_) {
      // continue to final error
    }

    console.error('Create user profile error:', error?.message || error);
    if (error?.code === 11000) {
      return res.status(409).json({
        error: 'A user profile conflict occurred. Restart the backend to apply database index cleanup, then try again.',
        details: error.message,
      });
    }
    return res.status(500).json({ error: 'Failed to create or update user profile' });
  }
});

// UPDATE CURRENT USER PROFILE
router.patch('/profile', authMiddleware, upload.single('avatarFile'), async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const firebaseEmail = String(req.user?.email || '').trim().toLowerCase();
    if (!firebaseUid) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const deletedMarker = await DeletedAccount.findOne(buildDeletedAccountQuery(firebaseUid, firebaseEmail))
      .select('_id')
      .lean();
    if (deletedMarker) {
      return res.status(403).json({ error: 'Account deleted', code: 'ACCOUNT_DELETED' });
    }

    const { name, email, bio, avatar, language } = req.body;
    const cleanLanguage = normalizeLanguage(language, '');
    const uploadedAvatarUrl = req.file
      ? await storeUploadedFile(req.file, {
          folder: 'goon/avatars',
          localPrefix: UPLOADS_URL_PREFIX,
        })
      : null;

    const existingUser = await User.findOne({ firebaseUid });
    const nextName = typeof name === 'string' ? name.trim() : (existingUser?.name || 'User');
    const nextEmail = typeof email === 'string'
      ? email.trim().toLowerCase()
      : (existingUser?.email || req.user?.email || `${firebaseUid}@firebase.local`).toLowerCase();
    const existingByEmail = existingUser
      ? null
      : await User.findOne({ email: nextEmail });

    if (!nextName || !nextEmail) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const update = {
      firebaseUid,
      name: nextName,
      email: nextEmail,
    };

    if (cleanLanguage) {
      update.language = cleanLanguage;
    }

    if (typeof bio === 'string') {
      update.bio = bio;
    }

    if (uploadedAvatarUrl) {
      if (existingUser?.avatar) {
        tryDeleteLocalAvatar(existingUser.avatar);
      }
      update.avatar = uploadedAvatarUrl;
    } else if (typeof avatar === 'string') {
      update.avatar = normalizeAvatarValue(avatar);
    }

    if (existingUser) {
      Object.assign(existingUser, update);
      const savedUser = await existingUser.save({ validateBeforeSave: false });
      return res.status(200).json(savedUser);
    }

    if (existingByEmail) {
      if (uploadedAvatarUrl && existingByEmail?.avatar) {
        tryDeleteLocalAvatar(existingByEmail.avatar);
      }

      const relinked = await User.findByIdAndUpdate(
        existingByEmail._id,
        {
          $set: {
            firebaseUid,
            name: nextName,
            email: nextEmail,
            bio: typeof bio === 'string' ? bio : existingByEmail.bio,
            ...(cleanLanguage ? { language: cleanLanguage } : {}),
            ...(uploadedAvatarUrl
              ? { avatar: uploadedAvatarUrl }
              : typeof avatar === 'string'
              ? { avatar: normalizeAvatarValue(avatar) }
              : {}),
          },
        },
        { new: true, runValidators: false }
      );

      return res.status(200).json(relinked || existingByEmail);
    }

    const createdUser = await User.create({
      firebaseUid,
      name: nextName,
      email: nextEmail,
      bio: typeof bio === 'string' ? bio : '',
      avatar: uploadedAvatarUrl || (typeof avatar === 'string' ? normalizeAvatarValue(avatar) : ''),
      ...(cleanLanguage ? { language: cleanLanguage } : {}),
      expoPushToken: null,
    });

    return res.status(200).json(createdUser);
  } catch (error) {
    console.error('Update current profile error:', error?.message || error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Profile conflict detected. Please retry.' });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE CURRENT USER ACCOUNT
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const firebaseEmail = String(req.user?.email || '').trim().toLowerCase();
    let authDeletionWarning = null;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let currentUser = await User.findOne({ firebaseUid });

    // Legacy compatibility: some profiles were created without firebaseUid linkage.
    if (!currentUser && firebaseEmail) {
      currentUser = await User.findOne({ email: firebaseEmail });
      if (currentUser && !currentUser.firebaseUid) {
        currentUser.firebaseUid = firebaseUid;
        await currentUser.save({ validateBeforeSave: false });
      }
    }

    if (!currentUser) {
      const marker = await upsertDeletedAccountMarker(firebaseUid, firebaseEmail);

      const authRevocation = await enforceFirebaseAccountRevocation(firebaseUid, marker?._id || null);
      if (!authRevocation.deleted && !authRevocation.disabled) {
        authDeletionWarning = 'Authentication account cleanup is pending. Please contact support if you can still sign in.';
      }

      // Idempotent deletion: if profile is already missing, consider deletion successful.
      return res.status(200).json({
        success: true,
        deleted: {
          userId: null,
          companies: 0,
          banners: 0,
          appointments: 0,
          messages: 0,
          notifications: 0,
          appreciations: 0,
        },
        profileNotFound: true,
        ...(authDeletionWarning ? { warning: authDeletionWarning } : {}),
      });
    }

    const ownedCompanies = await Company.find({ ownerId: currentUser._id }).select(
      '_id logo backgroundImage carouselImages galleryImages services'
    );
    const ownedCompanyIds = ownedCompanies.map((company) => company._id);

    const appointmentQuery = buildNonEmptyOrFilters([
      { senderId: currentUser._id },
      { receiverId: currentUser._id },
      ownedCompanyIds.length ? { companyId: { $in: ownedCompanyIds } } : null,
    ]);

    const relatedAppointments = appointmentQuery.length
      ? await Appointment.find({ $or: appointmentQuery }).select('_id')
      : [];
    const relatedAppointmentIds = relatedAppointments.map((appointment) => appointment._id);

    const appreciationQuery = buildNonEmptyOrFilters([
      { reviewerId: currentUser._id },
      { reviewedUserId: currentUser._id },
      ownedCompanyIds.length ? { companyId: { $in: ownedCompanyIds } } : null,
      relatedAppointmentIds.length ? { appointmentId: { $in: relatedAppointmentIds } } : null,
    ]);

    const messageQuery = buildNonEmptyOrFilters([
      { senderId: currentUser._id },
      { receiverId: currentUser._id },
      ownedCompanyIds.length ? { companyId: { $in: ownedCompanyIds } } : null,
    ]);

    const notificationQuery = buildNonEmptyOrFilters([
      { senderId: currentUser._id },
      { receiverId: currentUser._id },
      ownedCompanyIds.length ? { companyId: { $in: ownedCompanyIds } } : null,
      relatedAppointmentIds.length ? { appointmentId: { $in: relatedAppointmentIds } } : null,
    ]);

    const marker = await upsertDeletedAccountMarker(firebaseUid, currentUser?.email || firebaseEmail);
    const authRevocation = await enforceFirebaseAccountRevocation(firebaseUid, marker?._id || null);
    if (!authRevocation.deleted && !authRevocation.disabled) {
      authDeletionWarning = 'Authentication account cleanup is pending. Please contact support if you can still sign in.';
    }

    tryDeleteLocalAvatar(currentUser.avatar);
    for (const company of ownedCompanies) {
      tryDeleteLocalMedia(company?.logo);
      tryDeleteLocalMedia(company?.backgroundImage);
      for (const value of company?.carouselImages || []) {
        tryDeleteLocalMedia(value);
      }
      for (const value of company?.galleryImages || []) {
        tryDeleteLocalMedia(value);
      }
      for (const service of company?.services || []) {
        tryDeleteLocalMedia(service?.image);
        tryDeleteLocalMedia(service?.video);
      }
    }

    const [deletedBanners, deletedAppointments, deletedMessages, deletedNotifications, deletedAppreciations, deletedCompanies] = await Promise.all([
      Banner.deleteMany({ ownerId: currentUser._id }),
      appointmentQuery.length ? Appointment.deleteMany({ $or: appointmentQuery }) : { deletedCount: 0 },
      messageQuery.length ? Message.deleteMany({ $or: messageQuery }) : { deletedCount: 0 },
      notificationQuery.length ? Notification.deleteMany({ $or: notificationQuery }) : { deletedCount: 0 },
      appreciationQuery.length ? AppointmentAppreciation.deleteMany({ $or: appreciationQuery }) : { deletedCount: 0 },
      Company.deleteMany({ ownerId: currentUser._id }),
    ]);

    await User.deleteOne({ _id: currentUser._id });

    return res.status(200).json({
      success: true,
      deleted: {
        userId: String(currentUser._id),
        companies: deletedCompanies?.deletedCount || 0,
        banners: deletedBanners?.deletedCount || 0,
        appointments: deletedAppointments?.deletedCount || 0,
        messages: deletedMessages?.deletedCount || 0,
        notifications: deletedNotifications?.deletedCount || 0,
        appreciations: deletedAppreciations?.deletedCount || 0,
      },
      ...(authDeletionWarning ? { warning: authDeletionWarning } : {}),
    });
  } catch (error) {
    console.error('Delete current account error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// UPDATE PUSH TOKEN
router.patch('/:id/push-token', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawToken = req.body?.expoPushToken || req.body?.token || null;
    const token = isValidExpoPushToken(rawToken) ? rawToken : null;
    console.log('[TOKEN-SYNC] Route /:id/push-token called:', {
      userId: currentUser._id,
      requestedUserId: req.params.id,
      firebaseUid: req.user.uid,
      token: token ? token.substring(0, 30) + '...' : null,
    });

    if (!token) {
      console.log('[TOKEN-SYNC] No token provided');
      return res.status(200).json({
        message: rawToken
          ? 'Invalid push token ignored'
          : 'No push token provided, user kept connected',
        user: currentUser,
      });
    }

    const preferredTokens = selectPreferredPushTokens([
      ...(Array.isArray(currentUser?.expoPushTokens) ? currentUser.expoPushTokens : []),
      currentUser?.expoPushToken,
      token,
    ]);
    const pushContext = req.body?.pushContext;
    let pushRegistrations = buildPushRegistrations(currentUser, token, pushContext);
    let cleanedTokens = preferredTokens;

    if (isStandaloneContext(pushContext) && isModernExpoToken(token)) {
      // Remove legacy Expo Go tokens once a standalone token is known.
      cleanedTokens = preferredTokens.filter((entry) => !isLegacyExponentToken(entry));
      pushRegistrations = pushRegistrations.filter(
        (entry) => !isLegacyExponentToken(entry?.token)
      );
    }

    console.log('[TOKEN-SYNC] Registering token for user:', currentUser._id);
    await User.updateOne(
      { _id: currentUser._id },
      {
        $set: {
          expoPushToken: cleanedTokens[0] || null,
          expoPushTokens: cleanedTokens,
          expoPushRegistrations: pushRegistrations,
        },
      }
    );

    const updatedUser = await User.findById(currentUser._id);
    console.log('[TOKEN-SYNC] Token registered successfully:', {
      userId: updatedUser._id,
      expoPushToken: updatedUser.expoPushToken ? updatedUser.expoPushToken.substring(0, 30) + '...' : null,
      tokenCount: (updatedUser.expoPushTokens || []).length,
    });
    return res.status(200).json(updatedUser || currentUser);
  } catch (error) {
    console.error('Update push token error:', error);
    return res.status(500).json({ error: 'Failed to update push token' });
  }
});

// REMOVE PUSH TOKEN ON LOGOUT
router.delete('/:id/push-token', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = req.body?.expoPushToken || req.body?.token || null;
    console.log('[TOKEN-SYNC] Removing token on logout:', {
      userId: currentUser._id,
      requestedUserId: req.params.id,
      token: token ? token.substring(0, 30) + '...' : 'all tokens',
    });

    if (token) {
      await User.updateOne(
        { _id: currentUser._id },
        {
          $set: { expoPushToken: currentUser.expoPushToken === token ? null : currentUser.expoPushToken },
          $pull: { expoPushTokens: token, expoPushRegistrations: { token } },
        }
      );
    } else {
      await User.updateOne(
        { _id: currentUser._id },
        { $set: { expoPushToken: null, expoPushTokens: [], expoPushRegistrations: [] } }
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Remove push token error:', error);
    return res.status(500).json({ error: 'Failed to remove push token' });
  }
});

// UPDATE PUSH TOKEN (fallback without Mongo user id)
router.patch('/push-token', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const currentUser = await User.findOne({ firebaseUid: req.user.uid });
    console.log('[TOKEN-SYNC] Fallback /push-token route called:', {
      firebaseUid: req.user.uid,
      userId: currentUser?._id,
      tokenProvided: !!req.body?.expoPushToken || !!req.body?.token,
    });

    if (!currentUser) {
      console.log('[TOKEN-SYNC] User not found for Firebase UID:', req.user.uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const rawToken = req.body?.expoPushToken || req.body?.token || null;
    const token = isValidExpoPushToken(rawToken) ? rawToken : null;
    if (!token) {
      console.log('[TOKEN-SYNC] No token provided to fallback route');
      return res.status(200).json({
        message: rawToken
          ? 'Invalid push token ignored'
          : 'No push token provided, user kept connected',
        user: currentUser,
      });
    }

    console.log('[TOKEN-SYNC] Token received via fallback:', token.substring(0, 30) + '...');

    const preferredTokens = selectPreferredPushTokens([
      ...(Array.isArray(currentUser?.expoPushTokens) ? currentUser.expoPushTokens : []),
      currentUser?.expoPushToken,
      token,
    ]);
    const pushContext = req.body?.pushContext;
    let pushRegistrations = buildPushRegistrations(currentUser, token, pushContext);
    let cleanedTokens = preferredTokens;

    if (isStandaloneContext(pushContext) && isModernExpoToken(token)) {
      // Remove legacy Expo Go tokens once a standalone token is known.
      cleanedTokens = preferredTokens.filter((entry) => !isLegacyExponentToken(entry));
      pushRegistrations = pushRegistrations.filter(
        (entry) => !isLegacyExponentToken(entry?.token)
      );
    }

    console.log('[TOKEN-SYNC] Registering token for user via fallback:', currentUser._id);
    await User.updateOne(
      { _id: currentUser._id },
      {
        $set: {
          expoPushToken: cleanedTokens[0] || null,
          expoPushTokens: cleanedTokens,
          expoPushRegistrations: pushRegistrations,
        },
      }
    );

    const updatedUser = await User.findById(currentUser._id);
    console.log('[TOKEN-SYNC] Token registered successfully via fallback route:', {
      userId: updatedUser._id,
      expoPushToken: updatedUser.expoPushToken ? updatedUser.expoPushToken.substring(0, 30) + '...' : null,
      tokenCount: (updatedUser.expoPushTokens || []).length,
    });
    return res.status(200).json(updatedUser || currentUser);
  } catch (error) {
    console.error('Update push token fallback error:', error);
    return res.status(500).json({ error: 'Failed to update push token' });
  }
});

// NOTIFICATION PREFERENCES - GET
router.get('/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      preferences: sanitizeNotificationPreferences(user.notificationPreferences || {}),
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// NOTIFICATION PREFERENCES - PATCH
router.patch('/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const current = sanitizeNotificationPreferences(user.notificationPreferences || {});
    const next = sanitizeNotificationPreferences({
      ...current,
      ...(req.body?.preferences || req.body || {}),
    });

    user.notificationPreferences = next;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ preferences: next });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// DIAGNOSTIC: GET PUSH TOKEN STATUS
router.get('/diagnostic/tokens', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      userId: user._id,
      firebaseUid: user.firebaseUid,
      expoPushToken: user.expoPushToken || null,
      expoPushTokens: user.expoPushTokens || [],
      totalTokens: (user.expoPushTokens || []).length,
    });
  } catch (error) {
    console.error('Diagnostic tokens error:', error);
    return res.status(500).json({ error: 'Failed to get token status' });
  }
});

// DIAGNOSTIC: TEST PUSH SEND
router.post('/diagnostic/test-push', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rawTokens = [
      ...(Array.isArray(user.expoPushTokens) ? user.expoPushTokens : []),
      user.expoPushToken,
    ];

    const tokensToTest = Array.from(
      new Set(
        rawTokens.filter((token) => isValidExpoPushToken(token))
      )
    );

    if (!tokensToTest || tokensToTest.length === 0) {
      return res.status(400).json({ error: 'No push tokens found for this user' });
    }

    const result = await sendExpoPushNotifications({
      tokens: tokensToTest,
      title: '🧪 Test Notification',
      body: 'This is a test notification from GoOn backend',
      data: { testId: Date.now(), type: 'test' },
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to send test push',
        details: result.error || 'Unknown push error',
      });
    }

    return res.status(200).json({
      message: 'Test push sent',
      tokensAttempted: tokensToTest.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error('Test push error:', error);
    return res.status(500).json({ error: 'Failed to send test push', details: error.message });
  }
});

// FIREBASE UID
router.get('/firebase/:uid', authMiddleware, async (req, res) => {
  if (req.user.uid !== req.params.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const normalizedEmail = String(req.user?.email || '').trim().toLowerCase();
    const deletedMarker = await DeletedAccount.findOne(
      buildDeletedAccountQuery(req.params.uid, normalizedEmail)
    )
      .select('_id')
      .lean();
    if (deletedMarker) {
      return res.status(403).json({ error: 'Account deleted', code: 'ACCOUNT_DELETED' });
    }

    const user = await User.findOne({ firebaseUid: req.params.uid });
    if (user) {
      const normalized = normalizeAvatarValue(user.avatar || '');
      if (normalized !== (user.avatar || '')) {
        user.avatar = normalized;
        await user.save();
      }
    }
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user by firebase uid' });
  }
});

module.exports = router;