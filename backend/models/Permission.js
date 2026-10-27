const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    labels: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);