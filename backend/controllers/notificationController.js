const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');

async function getAuthenticatedMongoUser(req) {
  const firebaseUid = req.user?.uid;
  if (!firebaseUid) return null;
  return User.findOne({ firebaseUid });
}

// ===================== SEND =====================
const sendNotification = async (req, res) => {
  try {
    const {
      receiverId,
      message,
      title,
      type,
      date,
      companyId,
      appointmentId,
      status,
    } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const sender = await getAuthenticatedMongoUser(req);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notification = await Notification.create({
      companyId: companyId || null,
      appointmentId: appointmentId || null,
      senderId: sender._id,
      receiverId,
      message: message.trim(),
      title: title || sender.name,
      type: type || 'appointment',
      date: date || null,
      read: false,
      status: status || 'pending',
    });

    console.log('[PUSH] Notification created:', {
      notificationId: notification._id,
      receiverId,
      type: notification.type,
    });

    // Collect ALL possible tokens (including legacy ExponentPushToken) for max compatibility
    const allTokenCandidates = extractAllPushTokens(receiver);

    console.log('[PUSH] Receiver tokens found:', {
      receiverId,
      tokenCount: allTokenCandidates.length,
      tokens: allTokenCandidates.map((t) => (t ? t.substring(0, 30) + '...' : null)),
    });

    let notificationStatus = 'failed';
    let errorMessage = null;
    let successCount = 0;

    const pushResult = await sendExpoPushNotificationToUser(receiver, {
      title: notification.title,
      body: notification.message,
      data: {
        type: notification.type,
        appointmentId: notification.appointmentId ? String(notification.appointmentId) : null,
        companyId: notification.companyId ? String(notification.companyId) : null,
        status: notification.status,
        notificationId: notification._id.toString(),
        senderId: String(sender._id),
        receiverId,
      },
    }, {
      tokens: allTokenCandidates,
    });

    successCount = pushResult.successCount || 0;

    if (pushResult.queuedForDigest) {
      notificationStatus = 'pending';
      errorMessage = 'Queued for digest summary delivery';
      console.log('[PUSH] Notification queued for digest delivery');
    } else if (successCount > 0) {
      notificationStatus = 'sent';
      console.log(`[PUSH] Successfully sent to ${successCount}/${allTokenCandidates.length} tokens`);
    } else {
      errorMessage = pushResult.error || 'Failed to send push notification';
      console.log(`[PUSH] Failed to send: ${errorMessage}`);
    }

    // Update notification status after send attempt
    const updatedNotification = await Notification.findByIdAndUpdate(
      notification._id,
      {
        status: notificationStatus,
        deliveryState: pushResult.queuedForDigest
          ? 'digest_queued'
          : notificationStatus === 'sent'
            ? 'sent'
            : 'failed',
        ...(errorMessage ? { errorMessage } : {}),
      },
      { new: true }
    );

    console.log('[PUSH] Notification status updated:', {
      notificationId: updatedNotification._id,
      status: updatedNotification.status,
      error: updatedNotification.errorMessage,
    });

    return res.status(201).json(updatedNotification);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ===================== GET =====================
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = await getAuthenticatedMongoUser(req);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (String(currentUser._id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const notifications = await Notification.find({
      receiverId: userId,
    })
      .populate('senderId', 'name')
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter(n => !n.read).length;

    return res.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ===================== READ =====================
const markAsRead = async (req, res) => {
  const currentUser = await getAuthenticatedMongoUser(req);
  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, receiverId: currentUser._id },
    { read: true },
    { new: true }
  );

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  return res.json(notif);
};

const deleteNotification = async (req, res) => {
  try {
    const currentUser = await getAuthenticatedMongoUser(req);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      receiverId: currentUser._id,
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ success: true, deletedId: String(notif._id) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};


const getNotificationById = async (req, res) => {
  try {
    const currentUser = await getAuthenticatedMongoUser(req);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notification =
      await Notification.findById(req.params.id)
        .populate('senderId', 'name')
        .populate('receiverId', 'name');

    if (!notification) {
      return res.status(404).json({
        error: 'Appointment not found',
      });
    }

    const isParticipant =
      String(notification.senderId?._id || notification.senderId) === String(currentUser._id) ||
      String(notification.receiverId?._id || notification.receiverId) === String(currentUser._id);

    if (!isParticipant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(notification);

  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
};


module.exports = {
  sendNotification,
  getNotifications,
  markAsRead,
  getNotificationById,
  deleteNotification,
};