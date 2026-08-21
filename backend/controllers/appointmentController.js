const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');
const {
  buildAppointmentCreatedTitle,
  getUserNotificationLanguage,
} = require('../utils/notificationLocalization');

exports.createAppointment = async (req, res) => {
  try {
    const { companyId, senderId, receiverId, message, date } = req.body;

    // ================= VALIDATION =================
    if (!companyId || !senderId || !receiverId || !message) {
      return res.status(400).json({
        error: 'companyId, senderId, receiverId, message required',
      });
    }

    // ================= USERS =================
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sameMongoUser = String(sender._id) === String(receiver._id);
    const sameFirebaseUser =
      !!sender?.firebaseUid &&
      !!receiver?.firebaseUid &&
      String(sender.firebaseUid) === String(receiver.firebaseUid);

    if (sameMongoUser || sameFirebaseUser) {
      return res.status(400).json({ error: 'Cannot create an appointment with yourself' });
    }

    // ================= CREATE APPOINTMENT =================
    const appointment = await Appointment.create({
      companyId,
      senderId,
      receiverId,
      message: message.trim(),
      date: date || null,
      status: 'pending',
      type: 'appointment', // 🔥 FIX IMPORTANT
    });

    // ================= CREATE NOTIFICATION =================
    const notification = await Notification.create({
      companyId,
      appointmentId: appointment._id,
      senderId,
      receiverId,
      message: message.trim(),
      title: sender.name,
      type: 'appointment',
      date: date || null,
      read: false,
      status: 'pending',
    });

    
console.log("📦 Appointment created:", appointment._id);


    // ================= PUSH NOTIFICATION =================
    const receiverTokens = extractAllPushTokens(receiver);
    let notificationStatus = 'failed';
    let successCount = 0;

    const pushResult = await sendExpoPushNotificationToUser(receiver, {
      title: `📅 ${buildAppointmentCreatedTitle(getUserNotificationLanguage(receiver))}`,
      body: message,
      data: {
        type: 'appointment',
        appointmentId: appointment._id.toString(),
        notificationId: notification._id.toString(),
        senderId: String(sender._id),
        receiverId: String(receiver._id),
      },
    }, {
      tokens: receiverTokens,
    });

    successCount = pushResult.successCount || 0;
    if (pushResult.queuedForDigest) {
      notificationStatus = 'pending';
      console.log('[PUSH] Appointment notification queued for digest delivery');
    } else if (successCount > 0) {
      notificationStatus = 'sent';
      console.log(`[PUSH] Successfully sent appointment notification to ${successCount}/${receiverTokens.length} tokens`);
    } else {
      console.log(`[PUSH] Failed to send appointment notification: ${pushResult.error || 'unknown error'}`);
    }

    // Update notification status after send attempt
    await Notification.findByIdAndUpdate(
      notification._id,
      {
        status: notificationStatus,
        deliveryState: pushResult.queuedForDigest
          ? 'digest_queued'
          : notificationStatus === 'sent'
            ? 'sent'
            : 'failed',
        ...(pushResult?.error ? { errorMessage: pushResult.error } : {}),
      },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      appointment,
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};