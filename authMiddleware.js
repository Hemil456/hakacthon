const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/userModel');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided. Access denied.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id)
      .select('-passwordHash -otp -otpAttempts -refreshToken')
      .populate('role')
      .lean();

    if (!user) return next(new AppError('User no longer exists.', 401));
    if (!user.isActive) return next(new AppError('Account is deactivated. Contact administrator.', 403));

    req.user = user;
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    next(err);
  }
};

module.exports = protect;
