const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: [true, 'Product is required.'] },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Warehouse is required.'] },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    quantity: { type: Number, default: 0, min: [0, 'Stock quantity cannot be negative.'] },
  },
  { timestamps: true }
);

stockSchema.index({ product: 1, warehouse: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
