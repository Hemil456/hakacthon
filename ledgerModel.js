const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    transactionType: {
      type: String,
      enum: ['receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment'],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    referenceModel: { type: String, enum: ['Receipt', 'Delivery', 'Transfer', 'Adjustment'], required: true },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ledgerSchema.index({ product: 1, warehouse: 1, createdAt: -1 });
ledgerSchema.index({ referenceId: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
