const mongoose = require('mongoose');

const appointmentAppreciationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    liked: {
      type: Boolean,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

appointmentAppreciationSchema.index(
  { appointmentId: 1, reviewerId: 1 },
  { unique: true }
);

module.exports = mongoose.model('AppointmentAppreciation', appointmentAppreciationSchema);
