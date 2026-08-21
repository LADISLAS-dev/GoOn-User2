const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 180, default: '' },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    price: { type: String, trim: true, maxlength: 80, default: '' },
    ctaLabel: { type: String, trim: true, maxlength: 40, default: 'Voir' },
    ctaUrl: { type: String, trim: true, maxlength: 500, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    bg: {
      type: [String],
      default: ['#2D1B69', '#7B2FBE'],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: 'bg must contain at least 2 colors',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
