const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateDelivery } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), deliveryController.getAllDeliveries);
router.get('/:id', requireRole('admin', 'manager', 'staff'), deliveryController.getDelivery);
router.post('/', requireRole('admin', 'manager', 'staff'), validateDelivery, deliveryController.createDelivery);
router.put('/:id', requireRole('admin', 'manager'), validateDelivery, deliveryController.updateDelivery);
router.patch('/:id/confirm', requireRole('admin', 'manager'), deliveryController.confirmDelivery);
router.patch('/:id/cancel', requireRole('admin', 'manager'), deliveryController.cancelDelivery);

module.exports = router;
