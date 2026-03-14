const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Warehouse is required.'] },
    aisle: { type: String, trim: true, default: '' },
    shelf: { type: String, trim: true, default: '' },
    bin: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

locationSchema.index({ warehouse: 1, aisle: 1, shelf: 1, bin: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
