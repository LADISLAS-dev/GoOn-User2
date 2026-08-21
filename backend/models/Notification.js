const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: String,

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      default: 'message', // message | appointment
    },

    status: {
      type: String,
      default: 'pending', // pending | accepted | rejected
    },

    read: {
      type: Boolean,
      default: false,
    },

    date: String, // appointment date optional

    errorMessage: {
      type: String,
      default: null,
    },

    deliveryState: {
      type: String,
      default: 'pending', // pending | sent | failed | digest_queued | digest_sent
    },

    digestQueuedAt: {
      type: Date,
      default: null,
    },

    digestSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);