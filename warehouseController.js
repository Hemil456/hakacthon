const Warehouse = require('../models/warehouseModel');
const Stock = require('../models/stockModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllWarehouses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', isActive } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [warehouses, total] = await Promise.all([
      Warehouse.find(filter).populate('manager', 'name email').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Warehouse.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Warehouses retrieved successfully.', data: { warehouses }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllWarehouses error: ${err.message}`);
    next(err);
  }
};

const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id).populate('manager', 'name email').lean();
    if (!warehouse) return next(new AppError('Warehouse not found.', 404));

    const stockCount = await Stock.countDocuments({ warehouse: req.params.id });
    res.status(200).json({ success: true, message: 'Warehouse retrieved successfully.', data: { warehouse: { ...warehouse, stockCount } } });
  } catch (err) {
    logger.error(`getWarehouse error: ${err.message}`);
    next(err);
  }
};

const createWarehouse = async (req, res, next) => {
  try {
    const { name, location, manager } = req.body;
    const warehouse = await Warehouse.create({ name, location, manager: manager || null });
    const populated = await warehouse.populate('manager', 'name email');

    logger.info(`Warehouse created: ${warehouse.name}`);
    res.status(201).json({ success: true, message: 'Warehouse created successfully.', data: { warehouse: populated } });
  } catch (err) {
    logger.error(`createWarehouse error: ${err.message}`);
    next(err);
  }
};

const updateWarehouse = async (req, res, next) => {
  try {
    const { name, location, manager, isActive } = req.body;
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return next(new AppError('Warehouse not found.', 404));

    if (name !== undefined) warehouse.name = name;
    if (location !== undefined) warehouse.location = location;
    if (manager !== undefined) warehouse.manager = manager;
    if (isActive !== undefined) warehouse.isActive = isActive;

    await warehouse.save();
    const populated = await warehouse.populate('manager', 'name email');
    res.status(200).json({ success: true, message: 'Warehouse updated successfully.', data: { warehouse: populated } });
  } catch (err) {
    logger.error(`updateWarehouse error: ${err.message}`);
    next(err);
  }
};

const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return next(new AppError('Warehouse not found.', 404));
    warehouse.isActive = false;
    await warehouse.save();
    res.status(200).json({ success: true, message: 'Warehouse deactivated successfully.', data: null });
  } catch (err) {
    logger.error(`deleteWarehouse error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse };
