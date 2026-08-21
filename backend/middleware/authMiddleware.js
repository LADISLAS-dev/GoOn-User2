const admin = require('../services/firebaseAdmin');
const User = require('../models/User');
const DeletedAccount = require('../models/DeletedAccount');
const crypto = require('crypto');
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';

const hashEmail = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  const salt = String(process.env.DELETED_ACCOUNT_EMAIL_SALT || 'goon-deleted-account-salt');
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalized}`)
    .digest('hex');
};

module.exports = async (req, res, next) => {
  try {
    const raw = req.headers.authorization;
    if (AUTH_DEBUG) {
      console.log('AUTH DEBUG: authorization header present?', !!raw);
    }
    const token = raw?.split(' ')[1];

    if (!token) {
      if (AUTH_DEBUG) {
        console.warn('AUTH DEBUG: no token found in authorization header');
      }
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    const normalizedEmail = String(decodedToken?.email || '').trim().toLowerCase();
    const normalizedEmailHash = hashEmail(normalizedEmail);
    const deletedMarker = await DeletedAccount.findOne({
      $or: [
        { firebaseUid: decodedToken.uid },
        ...(normalizedEmailHash ? [{ emailHash: normalizedEmailHash }] : []),
        // Backward compatibility for legacy markers saved with plain email.
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    })
      .select('_id firebaseUid email deletedAt firebaseDeletedAt firebaseDeleteAttempts')
      .lean();

    if (deletedMarker) {
      if (!deletedMarker.firebaseDeletedAt) {
        try {
          await DeletedAccount.updateOne(
            { _id: deletedMarker._id },
            {
              $inc: { firebaseDeleteAttempts: 1 },
              $set: {
                firebaseDeleteLastAttemptAt: new Date(),
                firebaseDeleteLastError: '',
              },
            }
          );

          await admin.auth().deleteUser(decodedToken.uid);

          await DeletedAccount.updateOne(
            { _id: deletedMarker._id },
            {
              $set: {
                firebaseDeletedAt: new Date(),
                firebaseDeleteLastError: '',
              },
            }
          );
        } catch (cleanupError) {
          const code = cleanupError?.code;
          if (code === 'auth/user-not-found') {
            await DeletedAccount.updateOne(
              { _id: deletedMarker._id },
              {
                $set: {
                  firebaseDeletedAt: new Date(),
                  firebaseDeleteLastError: '',
                },
              }
            );
          } else {
            try {
              await admin.auth().updateUser(decodedToken.uid, { disabled: true });
              await DeletedAccount.updateOne(
                { _id: deletedMarker._id },
                {
                  $set: {
                    firebaseDeleteLastError: 'hard-delete-pending-disabled',
                  },
                }
              );
            } catch (_) {
              await DeletedAccount.updateOne(
                { _id: deletedMarker._id },
                {
                  $set: {
                    firebaseDeleteLastError: String(cleanupError?.message || code || 'cleanup-failed'),
                  },
                }
              );
            }
          }
        }
      }

      return res.status(403).json({
        error: 'Account deleted',
        code: 'ACCOUNT_DELETED',
      });
    }

    req.user = decodedToken; // uid ici

    // Mise à jour silencieuse du statut en ligne (fire-and-forget)
    User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      { lastActiveAt: new Date() },
      { new: false }
    ).catch(() => {});

    next();
  } catch (err) {
    if (AUTH_DEBUG) {
      console.error('AUTH DEBUG: verifyIdToken error:', err);
    }
    res.status(401).json({
      error: 'Invalid token',
      details: err.message,
    });
  }
};