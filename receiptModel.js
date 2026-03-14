const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1.'] },
    unitCost: { type: Number, required: true, min: [0, 'Unit cost cannot be negative.'] },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    referenceNo: { type: String, unique: true, trim: true },
    supplier: { type: String, required: [true, 'Supplier is required.'], trim: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Warehouse is required.'] },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiptDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' },
    items: {
      type: [receiptItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Receipt must have at least one item.' },
    },
  },
  { timestamps: true }
);

receiptSchema.index({ warehouse: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ receiptDate: -1 });

receiptSchema.pre('save', async function (next) {
  if (!this.referenceNo) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.referenceNo = `REC-${date}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Receipt', receiptSchema);
