const mongoose = require('mongoose');
const Adjustment = require('../models/adjustmentModel');
const { increaseStock, decreaseStock } = require('../services/stockService');
const { recordEntry } = require('../services/ledgerService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllAdjustments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', warehouse, status } = req.query;
    const filter = {};
    if (search) filter.reason = { $regex: search, $options: 'i' };
    if (warehouse) filter.warehouse = warehouse;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [adjustments, total] = await Promise.all([
      Adjustment.find(filter)
        .populate('warehouse', 'name location')
        .populate('adjustedBy', 'name email')
        .populate('items.product', 'name sku unit')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Adjustment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Adjustments retrieved successfully.',
      data: { adjustments },
      meta: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error(`getAllAdjustments error: ${err.message}`);
    next(err);
  }
};

const getAdjustment = async (req, res, next) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate('warehouse', 'name location')
      .populate('adjustedBy', 'name email')
      .populate('items.product', 'name sku unit')
      .lean();

    if (!adjustment) return next(new AppError('Adjustment not found.', 404));

    res.status(200).json({
      success: true,
      message: 'Adjustment retrieved successfully.',
      data: { adjustment },
    });
  } catch (err) {
    logger.error(`getAdjustment error: ${err.message}`);
    next(err);
  }
};

const createAdjustment = async (req, res, next) => {
  try {
    const { warehouse, reason, adjustmentDate, items } = req.body;

    const adjustment = await Adjustment.create({
      warehouse,
      adjustedBy: req.user._id,
      reason,
      adjustmentDate: adjustmentDate || Date.now(),
      items,
    });

    const populated = await adjustment.populate([
      { path: 'warehouse', select: 'name location' },
      { path: 'adjustedBy', select: 'name email' },
      { path: 'items.product', select: 'name sku unit' },
    ]);

    logger.info(`Adjustment created: ${adjustment.referenceNo} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Adjustment created successfully.',
      data: { adjustment: populated },
    });
  } catch (err) {
    logger.error(`createAdjustment error: ${err.message}`);
    next(err);
  }
};

const updateAdjustment = async (req, res, next) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) return next(new AppError('Adjustment not found.', 404));
    if (adjustment.status !== 'draft') return next(new AppError('Only draft adjustments can be edited.', 400));

    const { warehouse, reason, adjustmentDate, items } = req.body;
    if (warehouse !== undefined) adjustment.warehouse = warehouse;
    if (reason !== undefined) adjustment.reason = reason;
    if (adjustmentDate !== undefined) adjustment.adjustmentDate = adjustmentDate;
    if (items !== undefined) adjustment.items = items;

    await adjustment.save();

    const populated = await adjustment.populate([
      { path: 'warehouse', select: 'name location' },
      { path: 'adjustedBy', select: 'name email' },
      { path: 'items.product', select: 'name sku unit' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Adjustment updated successfully.',
      data: { adjustment: populated },
    });
  } catch (err) {
    logger.error(`updateAdjustment error: ${err.message}`);
    next(err);
  }
};

const confirmAdjustment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adjustment = await Adjustment.findById(req.params.id).session(session);
    if (!adjustment) throw new AppError('Adjustment not found.', 404);
    if (adjustment.status === 'confirmed') throw new AppError('Adjustment already confirmed.', 400);
    if (adjustment.status === 'cancelled') throw new AppError('Cancelled adjustments cannot be confirmed.', 400);

    for (const item of adjustment.items) {
      if (item.quantityChange > 0) {
        await increaseStock(item.product, adjustment.warehouse, null, item.quantityChange, session);
      } else {
        await decreaseStock(item.product, adjustment.warehouse, null, Math.abs(item.quantityChange), session);
      }
      await recordEntry({
        product: item.product,
        warehouse: adjustment.warehouse,
        type: 'adjustment',
        referenceId: adjustment._id,
        referenceModel: 'Adjustment',
        quantityChange: item.quantityChange,
        performedBy: req.user._id,
      }, session);
    }

    adjustment.status = 'confirmed';
    await adjustment.save({ session });

    await session.commitTransaction();
    session.endSession();

    logger.info(`Adjustment confirmed: ${adjustment.referenceNo}`);
    res.status(200).json({
      success: true,
      message: 'Adjustment confirmed and stock updated.',
      data: { adjustment },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`confirmAdjustment error: ${err.message}`);
    next(err);
  }
};

const cancelAdjustment = async (req, res, next) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) return next(new AppError('Adjustment not found.', 404));
    if (adjustment.status === 'confirmed') return next(new AppError('Confirmed adjustments cannot be cancelled.', 400));

    adjustment.status = 'cancelled';
    await adjustment.save();

    res.status(200).json({
      success: true,
      message: 'Adjustment cancelled successfully.',
      data: { adjustment },
    });
  } catch (err) {
    logger.error(`cancelAdjustment error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllAdjustments, getAdjustment, createAdjustment, updateAdjustment, confirmAdjustment, cancelAdjustment };
