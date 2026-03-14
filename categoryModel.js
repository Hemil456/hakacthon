const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1 });

module.exports = mongoose.model('Category', categorySchema);
