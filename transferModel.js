const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1.'] },
  },
  { _id: false }
);

const transferSchema = new mongoose.Schema(
  {
    referenceNo: { type: String, unique: true, trim: true },
    fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Source warehouse is required.'] },
    toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Destination warehouse is required.'] },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transferDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' },
    items: {
      type: [transferItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Transfer must have at least one item.' },
    },
  },
  { timestamps: true }
);

transferSchema.index({ fromWarehouse: 1 });
transferSchema.index({ toWarehouse: 1 });
transferSchema.index({ status: 1 });

transferSchema.pre('save', async function (next) {
  if (!this.referenceNo) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.referenceNo = `TRF-${date}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Transfer', transferSchema);
