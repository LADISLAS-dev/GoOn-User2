const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Message = require('../models/Message');
const Appointment = require('../models/Appointment');
const Company = require('../models/company');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');
const { messageFileFilter } = require('../middleware/upload');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');

const typingMap = new Map();
const typingKey = (companyId, senderId, receiverId) => `${companyId}:${senderId}:${receiverId}`;

const MESSAGE_UPLOAD_DIR = path.join(__dirname, '../uploads/messages-media');
fs.mkdirSync(MESSAGE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MESSAGE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: messageFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

async function getCurrentMongoUser(req) {
  if (!req.user?.uid) return null;
  return User.findOne({ firebaseUid: req.user.uid });
}

async function hasCompanyMessagingAccess({ companyId, currentUserId, peerId }) {
  const company = await Company.findById(companyId);
  if (!company) return { allowed: false, company: null };

  if (String(company.ownerId) === String(currentUserId)) {
    return { allowed: true, company };
  }

  if (!peerId) {
    return { allowed: false, company };
  }

  const [hasAppointment, hasMessageThread] = await Promise.all([
    Appointment.exists({
      companyId: company._id,
      $or: [
        { senderId: currentUserId, receiverId: peerId },
        { senderId: peerId, receiverId: currentUserId },
      ],
    }),
    Message.exists({
      companyId: company._id,
      $or: [
        { senderId: currentUserId, receiverId: peerId },
        { senderId: peerId, receiverId: currentUserId },
      ],
    }),
  ]);

  return { allowed: !!hasAppointment || !!hasMessageThread, company };
}

// POST /messages/typing
router.post('/typing', authMiddleware, async (req, res) => {
  try {
    const { companyId, receiverId, isTyping } = req.body;

    if (!companyId || !receiverId || typeof isTyping !== 'boolean') {
      return res.status(400).json({ error: 'companyId, receiverId and isTyping are required' });
    }

    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const access = await hasCompanyMessagingAccess({
      companyId,
      currentUserId: currentUser._id,
      peerId: receiverId,
    });
    if (!access.company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden: no access to this company conversation' });
    }

    const key = typingKey(String(companyId), String(currentUser._id), String(receiverId));

    if (isTyping) {
      typingMap.set(key, Date.now());
    } else {
      typingMap.delete(key);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /messages/typing/:companyId/:peerId
router.get('/typing/:companyId/:peerId', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const access = await hasCompanyMessagingAccess({
      companyId: req.params.companyId,
      currentUserId: currentUser._id,
      peerId: req.params.peerId,
    });
    if (!access.company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ error: 'Forbidden: no access to this company conversation' });
    }

    const key = typingKey(
      String(req.params.companyId),
      String(req.params.peerId),
      String(currentUser._id)
    );

    const lastSeen = typingMap.get(key);
    const isTyping = !!lastSeen && Date.now() - lastSeen < 5000;

    if (!isTyping && lastSeen) {
      typingMap.delete(key);
    }

    return res.json({ isTyping });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /messages/:companyId
router.get('/:companyId', authMiddleware, async (req, res) => {
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

    const messages = await Message.find({
      companyId: req.params.companyId,
      $and: [
        {
          $or: [
            { senderId: currentUser._id },
            { receiverId: currentUser._id },
          ],
        },
        {
          $or: [
            { senderId: ownerId },
            { receiverId: ownerId },
          ],
        },
      ],
    })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /messages
router.post('/', authMiddleware, upload.single('attachment'), async (req, res) => {
  try {
    const { companyId, receiverId, text } = req.body;
    const cleanedText = (text || '').trim();
    const hasAttachment = !!req.file;

    if (!companyId || !receiverId) {
      return res.status(400).json({ error: 'companyId and receiverId are required' });
    }

    if (!cleanedText && !hasAttachment) {
      return res.status(400).json({ error: 'text or attachment is required' });
    }

    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const sameMongoUser = String(receiver._id) === String(currentUser._id);
    const sameFirebaseUser =
      !!receiver?.firebaseUid &&
      !!currentUser?.firebaseUid &&
      String(receiver.firebaseUid) === String(currentUser.firebaseUid);

    if (sameMongoUser || sameFirebaseUser) {
      return res.status(400).json({ error: 'Cannot send a message to yourself' });
    }

    const ownerId = String(company.ownerId || '');
    const currentUserId = String(currentUser._id || '');
    const receiverMongoId = String(receiver._id || '');
    const pairIncludesOwner = currentUserId === ownerId || receiverMongoId === ownerId;

    if (!pairIncludesOwner) {
      return res.status(403).json({
        error: 'Forbidden: message participants must include the company owner',
      });
    }

    const message = await Message.create({
      companyId: String(company._id),
      senderId: String(currentUser._id),
      receiverId: String(receiver._id),
      text: cleanedText,
      attachmentUrl: hasAttachment ? `/uploads/messages-media/${req.file.filename}` : null,
      attachmentName: hasAttachment ? req.file.originalname : null,
      attachmentMime: hasAttachment ? req.file.mimetype : null,
      attachmentSize: hasAttachment ? req.file.size : null,
    });

    const previewMessage = hasAttachment
      ? `${req.file.mimetype?.startsWith('image/') ? 'Photo' : 'Document'}: ${req.file.originalname}`
      : cleanedText;

    const notification = await Notification.create({
      companyId: company._id,
      senderId: currentUser._id,
      receiverId: receiver._id,
      title: currentUser.name,
      message: previewMessage,
      type: 'message',
      read: false,
      status: 'pending',
    });

    const senderTokens = new Set(extractAllPushTokens(currentUser));
    const receiverTokens = extractAllPushTokens(receiver);
    const targetTokens = receiverTokens.filter((token) => !senderTokens.has(token));

    let notificationStatus = 'failed';
    let pushErrorMessage = null;
    let successCount = 0;

    if (targetTokens.length) {
      const pushResult = await sendExpoPushNotificationToUser(receiver, {
        title: currentUser.name,
        body: previewMessage,
        data: {
          type: 'message',
          messageId: String(message._id),
          notificationId: String(notification._id),
          companyId: String(company._id),
          senderId: String(currentUser._id),
          senderName: currentUser.name,
        },
      }, {
        tokens: targetTokens,
      });

      successCount = pushResult.successCount || 0;

      if (pushResult.queuedForDigest) {
        notificationStatus = 'pending';
        pushErrorMessage = 'Queued for digest summary delivery';
        console.log('[PUSH] Message notification queued for digest delivery');
      } else if (successCount > 0) {
        notificationStatus = 'sent';
        console.log(`[PUSH] Message notification sent to ${successCount}/${targetTokens.length} tokens`);
      } else {
        pushErrorMessage = pushResult.error || 'Push delivery failed for all recipient tokens';
        console.log(`[PUSH] Failed to send message notification to all ${targetTokens.length} tokens`);
      }
    } else if (receiverTokens.length) {
      pushErrorMessage = 'Receiver tokens match sender tokens (same device/session), push skipped to avoid self-delivery';
      console.warn(
        `Skipped push for message ${message._id}: all receiver tokens are owned by sender`
      );
    } else {
      pushErrorMessage = 'No push tokens found for receiver user';
      console.warn(
        `Skipped push for message ${message._id}: receiver has no expoPushToken`
      );
    }

    // Update notification status after send attempt
    await Notification.findByIdAndUpdate(
      notification._id,
      {
        status: notificationStatus,
        deliveryState: pushErrorMessage === 'Queued for digest summary delivery'
          ? 'digest_queued'
          : notificationStatus === 'sent'
            ? 'sent'
            : 'failed',
        ...(pushErrorMessage ? { errorMessage: pushErrorMessage } : {}),
      },
      { new: true }
    );

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /messages/:messageId
router.patch('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const cleanedText = (text || '').trim();

    if (!cleanedText) {
      return res.status(400).json({ error: 'text is required' });
    }

    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (String(message.senderId) !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Only the sender can edit this message' });
    }

    message.text = cleanedText;
    message.editedAt = new Date();
    await message.save();

    return res.json(message);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /messages/:messageId
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const currentUser = await getCurrentMongoUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Authenticated user not found in MongoDB' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (String(message.senderId) !== String(currentUser._id)) {
      return res.status(403).json({ error: 'Only the sender can delete this message' });
    }

    if (message.attachmentUrl) {
      const attachmentPath = path.join(MESSAGE_UPLOAD_DIR, path.basename(message.attachmentUrl));
      fs.unlink(attachmentPath, () => {});
    }

    await Message.deleteOne({ _id: message._id });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
