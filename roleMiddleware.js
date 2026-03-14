const { AppError } = require('./errorHandler');

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(new AppError('Access denied. No role assigned.', 403));
  }
  const userRole = req.user.role.name;
  if (!roles.includes(userRole)) {
    return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}.`, 403));
  }
  next();
};

module.exports = requireRole;
