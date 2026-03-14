const mongoose = require('mongoose');
const Transfer = require('../models/transferModel');
const { transferStock } = require('../services/stockService');
const { recordEntry } = require('../services/ledgerService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllTransfers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transfers, total] = await Promise.all([
      Transfer.find(filter).populate('fromWarehouse', 'name').populate('toWarehouse', 'name').populate('transferredBy', 'name email').populate('items.product', 'name sku unit').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Transfer.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Transfers retrieved successfully.', data: { transfers }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllTransfers error: ${err.message}`);
    next(err);
  }
};

const getTransfer = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id).populate('fromWarehouse', 'name location').populate('toWarehouse', 'name location').populate('transferredBy', 'name email').populate('items.product', 'name sku unit').lean();
    if (!transfer) return next(new AppError('Transfer not found.', 404));
    res.status(200).json({ success: true, message: 'Transfer retrieved successfully.', data: { transfer } });
  } catch (err) {
    logger.error(`getTransfer error: ${err.message}`);
    next(err);
  }
};

const createTransfer = async (req, res, next) => {
  try {
    const { fromWarehouse, toWarehouse, transferDate, items } = req.body;
    if (fromWarehouse === toWarehouse) return next(new AppError('Source and destination warehouses cannot be the same.', 400));

    const transfer = await Transfer.create({ fromWarehouse, toWarehouse, transferredBy: req.user._id, transferDate: transferDate || Date.now(), items });
    const populated = await transfer.populate([{ path: 'fromWarehouse', select: 'name' }, { path: 'toWarehouse', select: 'name' }, { path: 'transferredBy', select: 'name email' }, { path: 'items.product', select: 'name sku unit' }]);

    logger.info(`Transfer created: ${transfer.referenceNo}`);
    res.status(201).json({ success: true, message: 'Transfer created successfully.', data: { transfer: populated } });
  } catch (err) {
    logger.error(`createTransfer error: ${err.message}`);
    next(err);
  }
};

const updateTransfer = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return next(new AppError('Transfer not found.', 404));
    if (transfer.status !== 'draft') return next(new AppError('Only draft transfers can be edited.', 400));

    const { fromWarehouse, toWarehouse, transferDate, items } = req.body;
    if (fromWarehouse !== undefined) transfer.fromWarehouse = fromWarehouse;
    if (toWarehouse !== undefined) transfer.toWarehouse = toWarehouse;
    if (transferDate !== undefined) transfer.transferDate = transferDate;
    if (items !== undefined) transfer.items = items;

    await transfer.save();
    res.status(200).json({ success: true, message: 'Transfer updated successfully.', data: { transfer } });
  } catch (err) {
    logger.error(`updateTransfer error: ${err.message}`);
    next(err);
  }
};

const confirmTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) throw new AppError('Transfer not found.', 404);
    if (transfer.status === 'confirmed') throw new AppError('Transfer already confirmed.', 400);
    if (transfer.status === 'cancelled') throw new AppError('Cancelled transfers cannot be confirmed.', 400);

    for (const item of transfer.items) {
      await transferStock(transfer.fromWarehouse, transfer.toWarehouse, item.product, item.quantity, session);
      await recordEntry({ product: item.product, warehouse: transfer.fromWarehouse, type: 'transfer_out', referenceId: transfer._id, referenceModel: 'Transfer', quantityChange: -item.quantity, performedBy: req.user._id }, session);
      await recordEntry({ product: item.product, warehouse: transfer.toWarehouse, type: 'transfer_in', referenceId: transfer._id, referenceModel: 'Transfer', quantityChange: item.quantity, performedBy: req.user._id }, session);
    }

    transfer.status = 'confirmed';
    await transfer.save({ session });
    await session.commitTransaction();
    session.endSession();

    logger.info(`Transfer confirmed: ${transfer.referenceNo}`);
    res.status(200).json({ success: true, message: 'Transfer confirmed and stock updated.', data: { transfer } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`confirmTransfer error: ${err.message}`);
    next(err);
  }
};

const cancelTransfer = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return next(new AppError('Transfer not found.', 404));
    if (transfer.status === 'confirmed') return next(new AppError('Confirmed transfers cannot be cancelled.', 400));
    transfer.status = 'cancelled';
    await transfer.save();
    res.status(200).json({ success: true, message: 'Transfer cancelled successfully.', data: { transfer } });
  } catch (err) {
    logger.error(`cancelTransfer error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllTransfers, getTransfer, createTransfer, updateTransfer, confirmTransfer, cancelTransfer };
