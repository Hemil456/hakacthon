const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required.'], trim: true },
    sku: { type: String, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required.'] },
    unit: { type: String, required: [true, 'Unit is required.'], trim: true },
    minStockLevel: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);
