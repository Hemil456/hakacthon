const mongoose = require('mongoose');
const Receipt = require('../models/receiptModel');
const { increaseStock } = require('../services/stockService');
const { recordEntry } = require('../services/ledgerService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllReceipts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', warehouse, status } = req.query;
    const filter = {};
    if (search) filter.supplier = { $regex: search, $options: 'i' };
    if (warehouse) filter.warehouse = warehouse;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [receipts, total] = await Promise.all([
      Receipt.find(filter).populate('warehouse', 'name location').populate('receivedBy', 'name email').populate('items.product', 'name sku unit').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Receipt.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Receipts retrieved successfully.', data: { receipts }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllReceipts error: ${err.message}`);
    next(err);
  }
};

const getReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findById(req.params.id).populate('warehouse', 'name location').populate('receivedBy', 'name email').populate('items.product', 'name sku unit').lean();
    if (!receipt) return next(new AppError('Receipt not found.', 404));
    res.status(200).json({ success: true, message: 'Receipt retrieved successfully.', data: { receipt } });
  } catch (err) {
    logger.error(`getReceipt error: ${err.message}`);
    next(err);
  }
};

const createReceipt = async (req, res, next) => {
  try {
    const { supplier, warehouse, receiptDate, notes, items } = req.body;
    const receipt = await Receipt.create({ supplier, warehouse, receivedBy: req.user._id, receiptDate: receiptDate || Date.now(), notes: notes || '', items });
    const populated = await receipt.populate([{ path: 'warehouse', select: 'name location' }, { path: 'receivedBy', select: 'name email' }, { path: 'items.product', select: 'name sku unit' }]);

    logger.info(`Receipt created: ${receipt.referenceNo}`);
    res.status(201).json({ success: true, message: 'Receipt created successfully.', data: { receipt: populated } });
  } catch (err) {
    logger.error(`createReceipt error: ${err.message}`);
    next(err);
  }
};

const updateReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return next(new AppError('Receipt not found.', 404));
    if (receipt.status !== 'draft') return next(new AppError('Only draft receipts can be edited.', 400));

    const { supplier, warehouse, receiptDate, notes, items } = req.body;
    if (supplier !== undefined) receipt.supplier = supplier;
    if (warehouse !== undefined) receipt.warehouse = warehouse;
    if (receiptDate !== undefined) receipt.receiptDate = receiptDate;
    if (notes !== undefined) receipt.notes = notes;
    if (items !== undefined) receipt.items = items;

    await receipt.save();
    const populated = await receipt.populate([{ path: 'warehouse', select: 'name location' }, { path: 'receivedBy', select: 'name email' }, { path: 'items.product', select: 'name sku unit' }]);
    res.status(200).json({ success: true, message: 'Receipt updated successfully.', data: { receipt: populated } });
  } catch (err) {
    logger.error(`updateReceipt error: ${err.message}`);
    next(err);
  }
};

const confirmReceipt = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receipt = await Receipt.findById(req.params.id).session(session);
    if (!receipt) throw new AppError('Receipt not found.', 404);
    if (receipt.status === 'confirmed') throw new AppError('Receipt already confirmed.', 400);
    if (receipt.status === 'cancelled') throw new AppError('Cancelled receipts cannot be confirmed.', 400);

    for (const item of receipt.items) {
      await increaseStock(item.product, receipt.warehouse, null, item.quantity, session);
      await recordEntry({ product: item.product, warehouse: receipt.warehouse, type: 'receipt', referenceId: receipt._id, referenceModel: 'Receipt', quantityChange: item.quantity, performedBy: req.user._id }, session);
    }

    receipt.status = 'confirmed';
    await receipt.save({ session });
    await session.commitTransaction();
    session.endSession();

    logger.info(`Receipt confirmed: ${receipt.referenceNo}`);
    res.status(200).json({ success: true, message: 'Receipt confirmed and stock updated.', data: { receipt } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`confirmReceipt error: ${err.message}`);
    next(err);
  }
};

const cancelReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return next(new AppError('Receipt not found.', 404));
    if (receipt.status === 'confirmed') return next(new AppError('Confirmed receipts cannot be cancelled.', 400));
    receipt.status = 'cancelled';
    await receipt.save();
    res.status(200).json({ success: true, message: 'Receipt cancelled successfully.', data: { receipt } });
  } catch (err) {
    logger.error(`cancelReceipt error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllReceipts, getReceipt, createReceipt, updateReceipt, confirmReceipt, cancelReceipt };
