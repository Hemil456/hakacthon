const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Stock = require('../models/stockModel');
const Category = require('../models/categoryModel');
const generateSKU = require('../utils/generateSKU');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', category, isActive } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Products retrieved successfully.', data: { products }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllProducts error: ${err.message}`);
    next(err);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name description').lean();
    if (!product) return next(new AppError('Product not found.', 404));

    const stockData = await Stock.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: '$product', totalQuantity: { $sum: '$quantity' } } },
    ]);
    const totalStock = stockData[0]?.totalQuantity || 0;

    res.status(200).json({ success: true, message: 'Product retrieved successfully.', data: { product: { ...product, totalStock } } });
  } catch (err) {
    logger.error(`getProduct error: ${err.message}`);
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, category, unit, minStockLevel, description } = req.body;
    const categoryDoc = await Category.findById(category).lean();
    if (!categoryDoc) return next(new AppError('Category not found.', 404));

    const sku = await generateSKU(categoryDoc.name);
    const product = await Product.create({ name, sku, category, unit, minStockLevel: minStockLevel || 0, description: description || '' });
    const populated = await product.populate('category', 'name');

    logger.info(`Product created: ${product.name} [${sku}]`);
    res.status(201).json({ success: true, message: 'Product created successfully.', data: { product: populated } });
  } catch (err) {
    logger.error(`createProduct error: ${err.message}`);
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { name, category, unit, minStockLevel, description, isActive } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    if (category) {
      const categoryDoc = await Category.findById(category).lean();
      if (!categoryDoc) return next(new AppError('Category not found.', 404));
      product.category = category;
    }
    if (name !== undefined) product.name = name;
    if (unit !== undefined) product.unit = unit;
    if (minStockLevel !== undefined) product.minStockLevel = minStockLevel;
    if (description !== undefined) product.description = description;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    const populated = await product.populate('category', 'name');

    res.status(200).json({ success: true, message: 'Product updated successfully.', data: { product: populated } });
  } catch (err) {
    logger.error(`updateProduct error: ${err.message}`);
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found.', 404));

    const stockExists = await Stock.findOne({ product: req.params.id, quantity: { $gt: 0 } }).lean();
    if (stockExists) return next(new AppError('Cannot delete product with existing stock.', 400));

    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, message: 'Product deactivated successfully.', data: null });
  } catch (err) {
    logger.error(`deleteProduct error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct };
