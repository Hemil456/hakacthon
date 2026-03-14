const Stock = require('../models/stockModel');
const Ledger = require('../models/ledgerModel');
const Product = require('../models/productModel');
const { Parser } = require('json2csv');
const logger = require('../utils/logger');

const sendResponse = (res, data, fields, format, filename) => {
  if (format === 'csv') {
    try {
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${filename}.csv`);
      return res.send(csv);
    } catch (err) {
      logger.error(`CSV parse error: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Failed to generate CSV.' });
    }
  }
  res.status(200).json({ success: true, message: `${filename} report retrieved.`, data });
};

const stockSummary = async (req, res, next) => {
  try {
    const { format } = req.query;
    const data = await Stock.aggregate([
      {
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' },
      },
      { $unwind: '$product' },
      {
        $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouse' },
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          unit: '$product.unit',
          warehouseName: '$warehouse.name',
          warehouseLocation: '$warehouse.location',
          quantity: 1,
          minStockLevel: '$product.minStockLevel',
          isLow: { $lt: ['$quantity', '$product.minStockLevel'] },
        },
      },
      { $sort: { productName: 1 } },
    ]);

    const fields = ['productName', 'sku', 'unit', 'warehouseName', 'warehouseLocation', 'quantity', 'minStockLevel', 'isLow'];
    sendResponse(res, data, fields, format, 'stock-summary');
  } catch (err) {
    logger.error(`stockSummary report error: ${err.message}`);
    next(err);
  }
};

const ledgerReport = async (req, res, next) => {
  try {
    const { product, warehouse, type, startDate, endDate, format, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (product) filter.product = product;
    if (warehouse) filter.warehouse = warehouse;
    if (type) filter.transactionType = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      Ledger.find(filter)
        .populate('product', 'name sku')
        .populate('warehouse', 'name')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ledger.countDocuments(filter),
    ]);

    const fields = ['product.name', 'product.sku', 'warehouse.name', 'transactionType', 'quantityChange', 'quantityAfter', 'performedBy.name', 'createdAt'];
    if (format === 'csv') {
      const flat = entries.map((e) => ({
        product: e.product?.name,
        sku: e.product?.sku,
        warehouse: e.warehouse?.name,
        transactionType: e.transactionType,
        quantityChange: e.quantityChange,
        quantityAfter: e.quantityAfter,
        performedBy: e.performedBy?.name,
        date: e.createdAt,
      }));
      sendResponse(res, flat, Object.keys(flat[0] || {}), format, 'ledger-report');
    } else {
      res.status(200).json({
        success: true,
        message: 'Ledger report retrieved.',
        data: { entries },
        meta: { page: parseInt(page), limit: parseInt(limit), total },
      });
    }
  } catch (err) {
    logger.error(`ledgerReport error: ${err.message}`);
    next(err);
  }
};

const lowStockReport = async (req, res, next) => {
  try {
    const { format } = req.query;
    const data = await Stock.aggregate([
      {
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' },
      },
      { $unwind: '$product' },
      { $match: { $expr: { $lt: ['$quantity', '$product.minStockLevel'] } } },
      {
        $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouse' },
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          unit: '$product.unit',
          warehouseName: '$warehouse.name',
          currentQuantity: '$quantity',
          minStockLevel: '$product.minStockLevel',
          shortage: { $subtract: ['$product.minStockLevel', '$quantity'] },
        },
      },
      { $sort: { shortage: -1 } },
    ]);

    const fields = ['productName', 'sku', 'unit', 'warehouseName', 'currentQuantity', 'minStockLevel', 'shortage'];
    sendResponse(res, data, fields, format, 'low-stock-report');
  } catch (err) {
    logger.error(`lowStockReport error: ${err.message}`);
    next(err);
  }
};

const valuationReport = async (req, res, next) => {
  try {
    const { format } = req.query;
    const data = await Stock.aggregate([
      {
        $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouse' },
      },
      { $unwind: '$warehouse' },
      {
        $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'receipts',
          let: { productId: '$product._id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$status', 'confirmed'] } } },
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.product', '$$productId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { unitCost: '$items.unitCost' } },
          ],
          as: 'latestReceipt',
        },
      },
      {
        $addFields: {
          unitCost: { $ifNull: [{ $arrayElemAt: ['$latestReceipt.unitCost', 0] }, 0] },
        },
      },
      {
        $group: {
          _id: '$warehouse._id',
          warehouseName: { $first: '$warehouse.name' },
          warehouseLocation: { $first: '$warehouse.location' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    const fields = ['warehouseName', 'warehouseLocation', 'totalItems', 'totalQuantity', 'totalValue'];
    sendResponse(res, data, fields, format, 'valuation-report');
  } catch (err) {
    logger.error(`valuationReport error: ${err.message}`);
    next(err);
  }
};

module.exports = { stockSummary, ledgerReport, lowStockReport, valuationReport };
