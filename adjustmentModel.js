const mongoose = require('mongoose');

const adjustmentItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantityChange: { type: Number, required: true },
  },
  { _id: false }
);

const adjustmentSchema = new mongoose.Schema(
  {
    referenceNo: { type: String, unique: true, trim: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Warehouse is required.'] },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: [true, 'Reason is required.'], trim: true },
    adjustmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' },
    items: {
      type: [adjustmentItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Adjustment must have at least one item.' },
    },
  },
  { timestamps: true }
);

adjustmentSchema.index({ warehouse: 1 });
adjustmentSchema.index({ status: 1 });

adjustmentSchema.pre('save', async function (next) {
  if (!this.referenceNo) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.referenceNo = `ADJ-${date}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Adjustment', adjustmentSchema);
