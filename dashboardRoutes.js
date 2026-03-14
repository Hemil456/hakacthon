const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), dashboardController.getDashboard);

module.exports = router;
