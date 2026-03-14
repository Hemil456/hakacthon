const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: error.details.map((d) => d.message),
    });
  }
  next();
};

const objectId = Joi.string().hex().length(24);

module.exports = {
  validateRegister: validate(Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: objectId.required(),
  })),

  validateLogin: validate(Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  })),

  validateForgotPassword: validate(Joi.object({
    email: Joi.string().email().required(),
  })),

  validateVerifyOtp: validate(Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
  })),

  validateResetPassword: validate(Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    password: Joi.string().min(6).required(),
  })),

  validateProduct: validate(Joi.object({
    name: Joi.string().min(2).max(100).required(),
    category: objectId.required(),
    unit: Joi.string().required(),
    minStockLevel: Joi.number().min(0).default(0),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
  })),

  validateCategory: validate(Joi.object({
    name: Joi.string().min(2).max(100).required(),
    parentId: objectId.allow(null).optional(),
    description: Joi.string().allow('').optional(),
  })),

  validateWarehouse: validate(Joi.object({
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().required(),
    manager: objectId.allow(null).optional(),
    isActive: Joi.boolean().optional(),
  })),

  validateLocation: validate(Joi.object({
    warehouse: objectId.required(),
    aisle: Joi.string().allow('').optional(),
    shelf: Joi.string().allow('').optional(),
    bin: Joi.string().allow('').optional(),
  })),

  validateReceipt: validate(Joi.object({
    supplier: Joi.string().required(),
    warehouse: objectId.required(),
    receiptDate: Joi.date().optional(),
    notes: Joi.string().allow('').optional(),
    items: Joi.array().items(Joi.object({
      product: objectId.required(),
      quantity: Joi.number().min(1).required(),
      unitCost: Joi.number().min(0).required(),
    })).min(1).required(),
  })),

  validateDelivery: validate(Joi.object({
    customer: Joi.string().required(),
    warehouse: objectId.required(),
    deliveryDate: Joi.date().optional(),
    notes: Joi.string().allow('').optional(),
    items: Joi.array().items(Joi.object({
      product: objectId.required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
    })).min(1).required(),
  })),

  validateTransfer: validate(Joi.object({
    fromWarehouse: objectId.required(),
    toWarehouse: objectId.required(),
    transferDate: Joi.date().optional(),
    items: Joi.array().items(Joi.object({
      product: objectId.required(),
      quantity: Joi.number().min(1).required(),
    })).min(1).required(),
  })),

  validateAdjustment: validate(Joi.object({
    warehouse: objectId.required(),
    reason: Joi.string().required(),
    adjustmentDate: Joi.date().optional(),
    items: Joi.array().items(Joi.object({
      product: objectId.required(),
      quantityChange: Joi.number().not(0).required(),
    })).min(1).required(),
  })),

  validateUser: validate(Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    role: objectId.optional(),
    isActive: Joi.boolean().optional(),
  })),
};
