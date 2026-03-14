const Stock = require('../models/stockModel');
const Product = require('../models/productModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllStock = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, warehouse, product, low_stock, sortBy = 'updatedAt', order = 'desc' } = req.query;
    const filter = {};
    if (warehouse) filter.warehouse = warehouse;
    if (product) filter.product = product;
    if (low_stock === 'true') {
      const lowStockProducts = await Product.find({ isActive: true }).select('_id minStockLevel').lean();
      const lowStockIds = [];
      for (const p of lowStockProducts) {
        const stock = await Stock.findOne({ product: p._id, ...( warehouse ? { warehouse } : {}) }).lean();
        if (!stock || stock.quantity < p.minStockLevel) lowStockIds.push(p._id);
      }
      filter.product = { $in: lowStockIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [stocks, total] = await Promise.all([
      Stock.find(filter)
        .populate('product', 'name sku unit minStockLevel')
        .populate('warehouse', 'name location')
        .populate('location', 'aisle shelf bin')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Stock.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: 'Stock retrieved successfully.',
      data: { stocks },
      meta: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error(`getAllStock error: ${err.message}`);
    next(err);
  }
};

const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).lean();
    const lowStockItems = [];

    for (const product of products) {
      const stocks = await Stock.find({ product: product._id })
        .populate('warehouse', 'name location')
        .lean();

      const totalQty = stocks.reduce((sum, s) => sum + s.quantity, 0);
      if (totalQty < product.minStockLevel) {
        lowStockItems.push({ product, totalQuantity: totalQty, minStockLevel: product.minStockLevel, stocks });
      }
    }

    // Auto-create notifications for low stock (once per day per product)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const admins = await User.find({ isActive: true }).populate('role').lean();
    const adminUsers = admins.filter((u) => u.role?.name === 'admin' || u.role?.name === 'manager');

    for (const item of lowStockItems) {
      for (const admin of adminUsers) {
        const alreadySent = await Notification.findOne({
          user: admin._id,
          type: 'low_stock',
          message: { $regex: item.product.name },
          createdAt: { $gte: today, $lt: tomorrow },
        }).lean();

        if (!alreadySent) {
          await Notification.create({
            user: admin._id,
            message: `Low stock alert: "${item.product.name}" has only ${item.totalQuantity} ${item.product.unit} remaining (minimum: ${item.minStockLevel}).`,
            type: 'low_stock',
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Low stock items retrieved successfully.',
      data: { lowStockItems },
      meta: { total: lowStockItems.length },
    });
  } catch (err) {
    logger.error(`getLowStock error: ${err.message}`);
    next(err);
  }
};

const getStockByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const stocks = await Stock.find({ product: productId })
      .populate('warehouse', 'name location')
      .populate('location', 'aisle shelf bin')
      .lean();

    if (!stocks.length) return next(new AppError('No stock found for this product.', 404));

    const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);

    res.status(200).json({
      success: true,
      message: 'Stock by product retrieved successfully.',
      data: { stocks, totalQuantity },
    });
  } catch (err) {
    logger.error(`getStockByProduct error: ${err.message}`);
    next(err);
  }
};

const getStockByWarehouse = async (req, res, next) => {
  try {
    const { warehouseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [stocks, total] = await Promise.all([
      Stock.find({ warehouse: warehouseId })
        .populate('product', 'name sku unit minStockLevel')
        .populate('location', 'aisle shelf bin')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Stock.countDocuments({ warehouse: warehouseId }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Stock by warehouse retrieved successfully.',
      data: { stocks },
      meta: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error(`getStockByWarehouse error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllStock, getLowStock, getStockByProduct, getStockByWarehouse };
