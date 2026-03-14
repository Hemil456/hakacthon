const Category = require('../models/categoryModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [categories, total] = await Promise.all([
      Category.find(filter).populate('parentId', 'name').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Category.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Categories retrieved successfully.', data: { categories }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllCategories error: ${err.message}`);
    next(err);
  }
};

const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await Category.aggregate([
      { $match: { parentId: null } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'children',
          maxDepth: 5,
        },
      },
    ]);

    res.status(200).json({ success: true, message: 'Category tree retrieved successfully.', data: { tree } });
  } catch (err) {
    logger.error(`getCategoryTree error: ${err.message}`);
    next(err);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate('parentId', 'name').lean();
    if (!category) return next(new AppError('Category not found.', 404));
    res.status(200).json({ success: true, message: 'Category retrieved successfully.', data: { category } });
  } catch (err) {
    logger.error(`getCategory error: ${err.message}`);
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, parentId, description } = req.body;
    if (parentId) {
      const parent = await Category.findById(parentId).lean();
      if (!parent) return next(new AppError('Parent category not found.', 404));
    }
    const category = await Category.create({ name, parentId: parentId || null, description: description || '' });
    res.status(201).json({ success: true, message: 'Category created successfully.', data: { category } });
  } catch (err) {
    logger.error(`createCategory error: ${err.message}`);
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, parentId, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return next(new AppError('Category not found.', 404));

    if (parentId) {
      const parent = await Category.findById(parentId).lean();
      if (!parent) return next(new AppError('Parent category not found.', 404));
      if (parentId === req.params.id) return next(new AppError('Category cannot be its own parent.', 400));
      category.parentId = parentId;
    }
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;

    await category.save();
    res.status(200).json({ success: true, message: 'Category updated successfully.', data: { category } });
  } catch (err) {
    logger.error(`updateCategory error: ${err.message}`);
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) return next(new AppError('Category not found.', 404));

    const childExists = await Category.findOne({ parentId: req.params.id }).lean();
    if (childExists) return next(new AppError('Cannot delete category with subcategories.', 400));

    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted successfully.', data: null });
  } catch (err) {
    logger.error(`deleteCategory error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllCategories, getCategoryTree, getCategory, createCategory, updateCategory, deleteCategory };
