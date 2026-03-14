const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['admin', 'manager', 'staff'],
      required: [true, 'Role name is required.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    permissions: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
