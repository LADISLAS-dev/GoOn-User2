const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema(
  {
    masterEnabled: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true },
    allowBookings: { type: Boolean, default: true },
    allowGeneral: { type: Boolean, default: true },
    bannerEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    badgeEnabled: { type: Boolean, default: true },
    quietHoursEnabled: { type: Boolean, default: false },
    quietStart: { type: String, default: '22:00' },
    quietEnd: { type: String, default: '07:00' },
    pollingIntervalSec: { type: Number, default: 8 },
    digestEnabled: { type: Boolean, default: false },
    digestIntervalHours: { type: Number, default: 4 },
    digestLastSentAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  expoPushToken: String,
  expoPushTokens: { type: [String], default: [] },
  expoPushRegistrations: {
    type: [
      {
        token: { type: String, required: true },
        appOwnership: { type: String, default: null },
        executionEnvironment: { type: String, default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  language: { type: String, default: 'en' },
  stripeCustomerId: { type: String, default: '', select: false },
  stripeCardConsentAt: { type: Date, default: null, select: false },
  stripeCardConsentVersion: { type: String, default: '', select: false },
  lastActiveAt: { type: Date, default: null },
  blockedUsers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({}),
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);