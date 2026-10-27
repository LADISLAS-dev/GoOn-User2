const mongoose = require('mongoose');

const businessTypeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    labels: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    icon: { type: String, required: true },
    moduleKeys: { type: [{ type: String, trim: true }], default: [] },
    catalogVersion: { type: Number, default: 1 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

businessTypeSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('BusinessType', businessTypeSchema);