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
    beautyServiceCategories: {
      type: [{
        _id: false,
        id: { type: String, required: true, trim: true },
        fr: { type: String, trim: true },
        en: { type: String, trim: true },
      }],
      default: [],
    },
    logo: String,
    backgroundImage: String,
    latitude: Number,
    longitude: Number,
    deliveryZones: {
      type: [{
        _id: false,
        maxDistanceKm: { type: Number, min: 0, max: 500, required: true },
        feeMinor: { type: Number, min: 0, required: true },
        currency: { type: String, uppercase: true, minlength: 3, maxlength: 3, required: true },
      }],
      default: [],
    },

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
        images: { type: [String], default: [] },
        video: String,
        description: String,
        categoryId: { type: String, trim: true, default: '' },
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
        mode: { type: String, enum: ['test', 'live'], default: null },
        accountType: { type: String, enum: ['v2_full', 'express', 'standard', 'custom'], default: 'v2_full' },
        testAccountId: { type: String, default: '', trim: true },
        liveAccountId: { type: String, default: '', trim: true },
        legacyTestAccountId: { type: String, default: '', trim: true },
        legacyLiveAccountId: { type: String, default: '', trim: true },
        oauthStateHash: { type: String, default: '', select: false },
        oauthStateExpiresAt: { type: Date, default: null, select: false },
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