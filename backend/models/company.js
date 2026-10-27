const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    phone: String,
    email: String,
    website: String,
    location: String,
    businessTypeId: { type: String, trim: true, default: '' },
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

    enabledModules: {
      type: [
        {
          _id: false,
          key: { type: String, required: true, trim: true },
          enabled: { type: Boolean, default: true },
        },
      ],
      default: undefined,
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
    paymentAccounts: {
      stripe: {
        accountId: { type: String, default: '', trim: true },
        detailsSubmitted: { type: Boolean, default: false },
        chargesEnabled: { type: Boolean, default: false },
        payoutsEnabled: { type: Boolean, default: false },
      },
      paypal: {
        merchantId: { type: String, default: '', trim: true },
        trackingId: { type: String, default: '', trim: true },
        onboardingStatus: { type: String, enum: ['not_connected', 'pending', 'connected'], default: 'not_connected' },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);