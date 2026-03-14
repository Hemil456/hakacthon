const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1.'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative.'] },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    referenceNo: { type: String, unique: true, trim: true },
    customer: { type: String, required: [true, 'Customer is required.'], trim: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: [true, 'Warehouse is required.'] },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' },
    items: {
      type: [deliveryItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'Delivery must have at least one item.' },
    },
  },
  { timestamps: true }
);

deliverySchema.index({ warehouse: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ deliveryDate: -1 });

deliverySchema.pre('save', async function (next) {
  if (!this.referenceNo) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.referenceNo = `DEL-${date}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
