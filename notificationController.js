const Notification = require('../models/notificationModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const filter = { user: req.user._id };
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: { notifications, unreadCount },
      meta: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error(`getNotifications error: ${err.message}`);
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) return next(new AppError('Notification not found.', 404));

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: { notification },
    });
  } catch (err) {
    logger.error(`markAsRead error: ${err.message}`);
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: null,
    });
  } catch (err) {
    logger.error(`markAllAsRead error: ${err.message}`);
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
