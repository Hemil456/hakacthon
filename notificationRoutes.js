const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), notificationController.getNotifications);
router.patch('/read-all', requireRole('admin', 'manager', 'staff'), notificationController.markAllAsRead);
router.patch('/:id/read', requireRole('admin', 'manager', 'staff'), notificationController.markAsRead);

module.exports = router;
