const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    phone: String,
    email: String,
    website: String,
    location: String,
    categoryId: String,
    categoryIds: {
      type: [String],
      default: [],
    },
    logo: String,
    backgroundImage: String,
    latitude: Number,
    longitude: Number,

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    carouselImages: {
      type: [String],
      default: [],
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    services: [
      {
        name: String,
        price: Number,
        image: String,
        video: String,
        description: String,
      },
    ],

    // Visibility guard: draft/unverified companies stay private until approved.
    isDraft: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    setupStatus: {
      type: String,
      default: 'draft',
      trim: true,
    },
    profileValidatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);