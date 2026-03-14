const Product = require('../models/productModel');
const Warehouse = require('../models/warehouseModel');
const Stock = require('../models/stockModel');
const Receipt = require('../models/receiptModel');
const Delivery = require('../models/deliveryModel');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const getDashboard = async (req, res, next) => {
  try {
    const [
      totalProducts,
      totalWarehouses,
      recentReceipts,
      recentDeliveries,
      stockValue,
      lowStockCount,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Warehouse.countDocuments({ isActive: true }),
      Receipt.find({ status: 'confirmed' })
        .populate('warehouse', 'name')
        .populate('receivedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Delivery.find({ status: 'confirmed' })
        .populate('warehouse', 'name')
        .populate('dispatchedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Stock.aggregate([
        {
          $lookup: {
            from: 'receipts',
            let: { productId: '$product', warehouseId: '$warehouse' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$status', 'confirmed'] }, { $eq: ['$warehouse', '$$warehouseId'] }] } } },
              { $unwind: '$items' },
              { $match: { $expr: { $eq: ['$items.product', '$$productId'] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: 'latestReceipt',
          },
        },
        { $unwind: { path: '$latestReceipt', preserveNullAndEmpty: true } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: ['$quantity', { $ifNull: ['$latestReceipt.items.unitCost', 0] }],
              },
            },
          },
        },
      ]),
      (async () => {
        const products = await Product.find({ isActive: true }).select('_id minStockLevel').lean();
        let count = 0;
        for (const p of products) {
          const stock = await Stock.findOne({ product: p._id }).lean();
          if (!stock || stock.quantity < p.minStockLevel) count++;
        }
        return count;
      })(),
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully.',
      data: {
        stats: {
          totalProducts,
          totalWarehouses,
          lowStockCount,
          totalStockValue: stockValue[0]?.totalValue || 0,
        },
        recentReceipts,
        recentDeliveries,
      },
    });
  } catch (err) {
    logger.error(`getDashboard error: ${err.message}`);
    next(err);
  }
};

module.exports = { getDashboard };
