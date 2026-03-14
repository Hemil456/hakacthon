const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Warehouse name is required.'], trim: true },
    location: { type: String, required: [true, 'Location is required.'], trim: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warehouse', warehouseSchema);
