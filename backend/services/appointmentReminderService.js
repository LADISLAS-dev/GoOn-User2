const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractPreferredPushTokens } = require('../utils/pushTokenSelection');
const {
  buildAppointmentReminderCopy,
  getUserNotificationLanguage,
} = require('../utils/notificationLocalization');

const REMINDER_WINDOWS_MINUTES = [24 * 60, 60, 15];
const POLL_INTERVAL_MS = 60 * 1000;
const TRIGGER_GRACE_MS = 2 * 60 * 1000;
const MISSED_AFTER_MINUTES = 15;

let intervalRef = null;
let isTickRunning = false;

function formatReminderLabel(minutes) {
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function isInTriggerWindow({ nowMs, targetMs }) {
  return nowMs >= targetMs && nowMs <= targetMs + TRIGGER_GRACE_MS;
}

async function hasReminderAlreadyBeenSent(appointmentId, receiverId, reminderKey) {
  const existing = await Notification.exists({
    appointmentId,
    receiverId,
    type: 'appointment',
    status: reminderKey,
  });

  return Boolean(existing);
}

async function createAppointmentNotification({ appointment, receiverId, statusKey, title, message }) {
  const alreadySent = await hasReminderAlreadyBeenSent(appointment._id, receiverId, statusKey);

  if (alreadySent) return null;

  return Notification.create({
    companyId: appointment.companyId,
    appointmentId: appointment._id,
    senderId: appointment.senderId,
    receiverId,
    title,
    message,
    type: 'appointment',
    status: statusKey,
    date: appointment.date || null,
    read: false,
  });
}

async function notifyRecipients({ appointment, usersById, statusKey, buildCopy }) {
  const recipients = [String(appointment.senderId), String(appointment.receiverId)];

  for (const receiverId of recipients) {
    const receiver = usersById.get(receiverId);
    const language = getUserNotificationLanguage(receiver);
    const { title, message } = buildCopy({ language, receiver, receiverId });

    const notification = await createAppointmentNotification({
      appointment,
      receiverId,
      statusKey,
      title,
      message,
    });

    if (!notification) continue;

    const receiverTokens = extractPreferredPushTokens(receiver);
    if (receiverTokens.length > 0) {
      await sendExpoPushNotificationToUser(receiver, {
        title: notification.title,
        body: notification.message,
        data: {
          type: 'appointment',
          appointmentId: String(appointment._id),
          companyId: String(appointment.companyId),
          notificationId: String(notification._id),
          status: notification.status,
        },
      }, {
        tokens: receiverTokens,
      });
    }
  }
}

async function processAppointmentReminder(appointment, usersById, now) {
  const appointmentDate = new Date(appointment.date);
  if (Number.isNaN(appointmentDate.getTime())) return;

  const appointmentMs = appointmentDate.getTime();
  const nowMs = now.getTime();

  for (const reminderMinutes of REMINDER_WINDOWS_MINUTES) {
    const reminderAtMs = appointmentMs - (reminderMinutes * 60 * 1000);
    if (!isInTriggerWindow({ nowMs, targetMs: reminderAtMs })) continue;

    await notifyRecipients({
      appointment,
      usersById,
      statusKey: `reminder_${reminderMinutes}m`,
      buildCopy: ({ language }) => buildAppointmentReminderCopy(language, reminderMinutes, 'reminder'),
    });
  }

  if (isInTriggerWindow({ nowMs, targetMs: appointmentMs })) {
    await notifyRecipients({
      appointment,
      usersById,
      statusKey: 'appointment_now',
      buildCopy: ({ language }) => buildAppointmentReminderCopy(language, 0, 'now'),
    });
  }

  const missedAtMs = appointmentMs + (MISSED_AFTER_MINUTES * 60 * 1000);
  if (isInTriggerWindow({ nowMs, targetMs: missedAtMs })) {
    await notifyRecipients({
      appointment,
      usersById,
      statusKey: 'appointment_missed',
      buildCopy: ({ language }) => buildAppointmentReminderCopy(language, 0, 'missed'),
    });
  }
}

async function reminderTick() {
  if (isTickRunning) return;
  isTickRunning = true;

  try {
    const now = new Date();

    const appointments = await Appointment.find({
      status: { $in: ['pending', 'accepted'] },
      date: { $exists: true, $ne: null, $ne: '' },
    })
      .select('_id companyId senderId receiverId date status')
      .lean();

    if (!appointments.length) return;

    const userIds = new Set();
    appointments.forEach((a) => {
      if (a.senderId) userIds.add(String(a.senderId));
      if (a.receiverId) userIds.add(String(a.receiverId));
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('_id language expoPushToken expoPushTokens')
      .lean();

    const usersById = new Map(users.map((u) => [String(u._id), u]));

    for (const appointment of appointments) {
      await processAppointmentReminder(appointment, usersById, now);
    }
  } catch (error) {
    console.error('Reminder tick error:', error.message);
  } finally {
    isTickRunning = false;
  }
}

function startAppointmentReminderService() {
  if (intervalRef) return;

  reminderTick();
  intervalRef = setInterval(reminderTick, POLL_INTERVAL_MS);
  console.log('Reminder service started (24h, 1h, 15min + now + missed windows).');
}

module.exports = {
  startAppointmentReminderService,
};
