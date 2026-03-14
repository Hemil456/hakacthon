const User = require('../models/userModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc', isActive } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).populate('role', 'name').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, message: 'Users retrieved successfully.', data: { users }, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    logger.error(`getAllUsers error: ${err.message}`);
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('role', 'name permissions').lean();
    if (!user) return next(new AppError('User not found.', 404));
    res.status(200).json({ success: true, message: 'User retrieved successfully.', data: { user } });
  } catch (err) {
    logger.error(`getUser error: ${err.message}`);
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found.', 404));

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const updated = await User.findById(user._id).populate('role', 'name').lean();
    res.status(200).json({ success: true, message: 'User updated successfully.', data: { user: updated } });
  } catch (err) {
    logger.error(`updateUser error: ${err.message}`);
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found.', 404));
    user.isActive = false;
    await user.save();
    res.status(200).json({ success: true, message: 'User deactivated successfully.', data: null });
  } catch (err) {
    logger.error(`deleteUser error: ${err.message}`);
    next(err);
  }
};

module.exports = { getAllUsers, getUser, updateUser, deleteUser };
