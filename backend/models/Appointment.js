const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
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

    message: {
      type: String,
      required: true,
    },

    date: String,

    serviceSelection: {
      serviceId: { type: String, default: '' },
      name: { type: String, default: '' },
      categoryId: { type: String, default: '' },
      price: { type: Number, default: null },
      selectedImage: { type: String, default: '' },
    },

    type: {
      type: String,
      default: 'appointment',
    },

    status: {
      type: String,
      default: 'pending', // pending | accepted | rejected
    },

    cancellationReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);