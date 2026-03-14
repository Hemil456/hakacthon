const mongoose = require('mongoose');
const Delivery = require('../models/deliveryModel');
const { decreaseStock } = require('../services/stockService');
const { recordEntry } = require('../services/ledgerService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllDeliveries = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', warehouse, status } = req.query;
    const filter = {};
    if (search) filter.customer = { $regex: search, $options: 'i' };
    if (warehouse) filter.warehouse = warehouse;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [deliveries, total] = await Promise.all([
      Delivery.find(filter).populate('warehouse', 'name location').populate('dispatchedBy', 'name email').populate('items.product', 'name sku unit').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Delivery.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Deliveries retrieved successfully.', data: { deliveries }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllDeliveries error: ${err.message}`);
    next(err);
  }
};

const getDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('warehouse', 'name location').populate('dispatchedBy', 'name email').populate('items.product', 'name sku unit').lean();
    if (!delivery) return next(new AppError('Delivery not found.', 404));
    res.status(200).json({ success: true, message: 'Delivery retrieved successfully.', data: { delivery } });
  } catch (err) {
    logger.error(`getDelivery error: ${err.message}`);
    next(err);
  }
};

const createDelivery = async (req, res, next) => {
  try {
    const { customer, warehouse, deliveryDate, notes, items } = req.body;
    const delivery = await Delivery.create({ customer, warehouse, dispatchedBy: req.user._id, deliveryDate: deliveryDate || Date.now(), notes: notes || '', items });
    const populated = await delivery.populate([{ path: 'warehouse', select: 'name location' }, { path: 'dispatchedBy', select: 'name email' }, { path: 'items.product', select: 'name sku unit' }]);

    logger.info(`Delivery created: ${delivery.referenceNo}`);
    res.status(201).json({ success: true, message: 'Delivery created successfully.', data: { delivery: populated } });
  } catch (err) {
    logger.error(`createDelivery error: ${err.message}`);
    next(err);
  }
};

const updateDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return next(new AppError('Delivery not found.', 404));
    if (delivery.status !== 'draft') return next(new AppError('Only draft deliveries can be edited.', 400));

    const { customer, warehouse, deliveryDate, notes, items } = req.body;
    if (customer !== undefined) delivery.customer = customer;
    if (warehouse !== undefined) delivery.warehouse = warehouse;
    if (deliveryDate !== undefined) delivery.deliveryDate = deliveryDate;
    if (notes !== undefined) delivery.notes = notes;
    if (items !== undefined) delivery.items = items;

    await delivery.save();
    const populated = await delivery.populate([{ path: 'warehouse', select: 'name location' }, { path: 'dispatchedBy', select: 'name email' }, { path: 'items.product', select: 'name sku unit' }]);
    res.status(200).json({ success: true, message: 'Delivery updated successfully.', data: { delivery: populated } });
  } catch (err) {
    logger.error(`updateDelivery error: ${err.message}`);
    next(err);
  }
};

const confirmDelivery = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const delivery = await Delivery.findById(req.params.id).session(session);
    if (!delivery) throw new AppError('Delivery not found.', 404);
    if (delivery.status === 'confirmed') throw new AppError('Delivery already confirmed.', 400);
    if (delivery.status === 'cancelled') throw new AppError('Cancelled deliveries cannot be confirmed.', 400);

    for (const item of delivery.items) {
      await decreaseStock(item.product, delivery.warehouse, null, item.quantity, session);
      await recordEntry({ product: item.product, warehouse: delivery.warehouse, type: 'delivery', referenceId: delivery._id, referenceModel: 'Delivery', quantityChange: -item.quantity, performedBy: req.user._id }, session);
    }

    delivery.status = 'confirmed';
    await delivery.save({ session });
    await session.commitTransaction();
    session.endSession();

    logger.info(`Delivery confirmed: ${delivery.referenceNo}`);
    res.status(200).json({ success: true, message: 'Delivery confirmed and stock updated.', data: { delivery } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`confirmDelivery error: ${err.message}`);
    next(err);
  }
};

const cancelDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return next(new AppError('Delivery not found.', 404));
    if (delivery.status === 'confirmed') return next(new AppError('Confirmed deliveries cannot be cancelled.', 400));
    delivery.status = 'cancelled';
    await delivery.save();
    res.status(200).json({ success: true, message: 'Delivery cancelled successfully.', data: { delivery } });
  } catch (err) {
    logger.error(`cancelDelivery error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllDeliveries, getDelivery, createDelivery, updateDelivery, confirmDelivery, cancelDelivery };
