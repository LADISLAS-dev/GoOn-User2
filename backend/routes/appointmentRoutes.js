const express = require('express');
const router = express.Router();

const Appointment = require('../models/Appointment');
const Company = require('../models/company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');
const {
  buildAppointmentStatusUpdateCopy,
  getUserNotificationLanguage,
} = require('../utils/notificationLocalization');
const AppointmentAppreciation = require('../models/AppointmentAppreciation');

const {
  createAppointment,
} = require('../controllers/appointmentController');

async function getCurrentMongoUser(req) {
  if (!req.user?.uid) return null;
  return User.findOne({ firebaseUid: req.user.uid });
}

function summarizeAppreciations(appreciations = []) {
  const total = appreciations.length;
  const likes = appreciations.filter((a) => a.liked === true).length;
  const dislikes = appreciations.filter((a) => a.liked === false).length;
  const ratings = appreciations
    .map((a) => (typeof a.rating === 'number' ? a.rating : null))
    .filter((v) => v !== null);

  const averageRating = ratings.length
    ? Number((ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(2))
    : null;

  return {
    total,
    likes,
    dislikes,
    averageRating,
  };
}

router.get('/:id/appreciations', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const senderId = String(appointment.senderId?._id || appointment.senderId);
    const receiverId = String(appointment.receiverId?._id || appointment.receiverId);
    const currentUserId = String(currentUser._id);

    if (currentUserId !== senderId && currentUserId !== receiverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const appreciations = await AppointmentAppreciation.find({ appointmentId: appointment._id })
      .populate('reviewerId', 'name email avatar')
      .populate('reviewedUserId', 'name email avatar')
      .sort({ createdAt: -1 });

    const mine = appreciations.find(
      (a) => String(a.reviewerId?._id || a.reviewerId) === currentUserId
    ) || null;

    const fromOther = appreciations.find(
      (a) => String(a.reviewedUserId?._id || a.reviewedUserId) === currentUserId
    ) || null;

    return res.json({
      appointmentId: String(appointment._id),
      status: appointment.status,
      mine,
      fromOther,
      summary: summarizeAppreciations(appreciations),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/appreciations', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const senderId = String(appointment.senderId?._id || appointment.senderId);
    const receiverId = String(appointment.receiverId?._id || appointment.receiverId);
    const currentUserId = String(currentUser._id);

    if (currentUserId !== senderId && currentUserId !== receiverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (String(appointment.status || '').toLowerCase() !== 'completed') {
      return res.status(400).json({ error: 'Appreciation is available only after completion' });
    }

    const liked = req.body?.liked;
    if (typeof liked !== 'boolean') {
      return res.status(400).json({ error: 'liked must be a boolean' });
    }

    let rating = null;
    if (req.body?.rating !== undefined && req.body?.rating !== null && req.body?.rating !== '') {
      const parsed = Number(req.body.rating);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
      }
      rating = parsed;
    }

    const comment = String(req.body?.comment || '').trim().slice(0, 300);

    const reviewedUserId = currentUserId === senderId ? receiverId : senderId;

    const mine = await AppointmentAppreciation.findOneAndUpdate(
      {
        appointmentId: appointment._id,
        reviewerId: currentUser._id,
      },
      {
        appointmentId: appointment._id,
        companyId: appointment.companyId,
        reviewerId: currentUser._id,
        reviewedUserId,
        liked,
        rating,
        comment,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('reviewerId', 'name email avatar')
      .populate('reviewedUserId', 'name email avatar');

    const appreciations = await AppointmentAppreciation.find({ appointmentId: appointment._id })
      .populate('reviewerId', 'name email avatar')
      .populate('reviewedUserId', 'name email avatar')
      .sort({ createdAt: -1 });

    const fromOther = appreciations.find(
      (a) => String(a.reviewedUserId?._id || a.reviewedUserId) === currentUserId
    ) || null;

    return res.status(201).json({
      success: true,
      appointmentId: String(appointment._id),
      mine,
      fromOther,
      summary: summarizeAppreciations(appreciations),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Appreciation already exists for this user and appointment' });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const currentUser = await getCurrentMongoUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
  }

  const { companyId } = req.body;
  if (!companyId) {
    return res.status(400).json({ error: 'companyId is required' });
  }

  const company = await Company.findById(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const isOwner = String(company.ownerId) === String(currentUser._id);
  const ownerUser = await User.findById(company.ownerId);

  // Prevent sender spoofing: sender is always the authenticated user.
  req.body.senderId = currentUser._id;
  req.body.companyId = company._id;

  // For non-owners, receiver is the company owner when available.
  // If owner account was deleted (orphan company), fallback to a valid payload receiver.
  if (!isOwner && ownerUser) {
    req.body.receiverId = ownerUser._id;
  } else if (!req.body.receiverId && ownerUser) {
    req.body.receiverId = ownerUser._id;
  }

  if (!req.body.receiverId) {
    return res.status(400).json({ error: 'receiverId is required' });
  }

  const fallbackReceiver = await User.findById(req.body.receiverId);
  if (!fallbackReceiver) {
    return res.status(404).json({
      error: 'Receiver not found. Company owner account may be missing.',
    });
  }

  return createAppointment(req, res);
});

router.get('/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (String(company.ownerId) !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const ownerId = String(company.ownerId || '');

    const appointments = await Appointment.find({
      companyId: company._id,
      $or: [
        { senderId: ownerId },
        { receiverId: ownerId },
      ],
    })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const ownerId = String(company.ownerId || '');

    const appointments = await Appointment.find({
      companyId: company._id,
      $or: [
        { senderId: currentUser._id },
        { receiverId: currentUser._id },
      ],
      $and: [
        {
          $or: [
            { senderId: ownerId },
            { receiverId: ownerId },
          ],
        },
      ],
    })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const appointment =
      await Appointment.findById(
        req.params.id
      )
        .populate('senderId', 'name email')
        .populate('receiverId', 'name email');

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
      });
    }

    const senderId = String(appointment.senderId?._id || appointment.senderId);
    const receiverId = String(appointment.receiverId?._id || appointment.receiverId);

    if (senderId !== String(currentUser._id) && receiverId !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(appointment);

  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        error: 'Appointment not found',
      });
    }

    if (
      String(existing.senderId) !== String(currentUser._id) &&
      String(existing.receiverId) !== String(currentUser._id)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const nextStatus = String(req.body.status || '').toLowerCase();
    const allowedStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatePayload = { status: nextStatus };
    if (nextStatus === 'cancelled' && req.body.cancellationReason) {
      updatePayload.cancellationReason = String(req.body.cancellationReason).trim();
    }

    const appointment =
      await Appointment.findByIdAndUpdate(
        req.params.id,
        updatePayload,
        {
          new: true,
        }
      );

    const statusChanged = String(existing.status || '') !== nextStatus;
    if (statusChanged) {
      const targetUserId =
        String(existing.senderId) === String(currentUser._id)
          ? existing.receiverId
          : existing.senderId;

      const targetUser = await User.findById(targetUserId);
      if (targetUser) {
        const language = getUserNotificationLanguage(targetUser);
        const { title, message } = buildAppointmentStatusUpdateCopy(
          language,
          currentUser.name || 'Utilisateur',
          nextStatus
        );

        const notification = await Notification.create({
          companyId: existing.companyId,
          appointmentId: existing._id,
          senderId: currentUser._id,
          receiverId: targetUserId,
          title,
          message,
          type: 'appointment',
          status: nextStatus,
          date: existing.date || null,
          read: false,
        });

        const targetTokens = extractAllPushTokens(targetUser);
        const pushResult = await sendExpoPushNotificationToUser(targetUser, {
          title: notification.title,
          body: notification.message,
          data: {
            type: 'appointment',
            appointmentId: String(existing._id),
            companyId: String(existing.companyId),
            notificationId: String(notification._id),
            status: nextStatus,
            senderId: String(currentUser._id),
            senderName: currentUser.name || 'Utilisateur',
          },
        }, {
          tokens: targetTokens,
        });

        if (pushResult.queuedForDigest) {
          await Notification.findByIdAndUpdate(notification._id, {
            status: nextStatus,
            deliveryState: 'digest_queued',
            errorMessage: 'Queued for digest summary delivery',
            digestQueuedAt: new Date(),
          });
        } else if (pushResult.successCount > 0) {
          await Notification.findByIdAndUpdate(notification._id, {
            status: nextStatus,
            deliveryState: 'sent',
          });
        } else {
          await Notification.findByIdAndUpdate(notification._id, {
            status: nextStatus,
            deliveryState: 'failed',
            errorMessage: pushResult.error || 'Push notification delivery failed',
          });
        }
      }
    }

    res.json(appointment);

  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (
      String(existing.senderId) !== String(currentUser._id) &&
      String(existing.receiverId) !== String(currentUser._id)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const status = String(existing.status || '').toLowerCase();
    const deletableStatuses = ['completed', 'cancelled', 'rejected'];
    if (!deletableStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Only completed or cancelled appointments can be deleted',
      });
    }

    await Appointment.deleteOne({ _id: existing._id });

    return res.json({
      success: true,
      deletedId: String(existing._id),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;