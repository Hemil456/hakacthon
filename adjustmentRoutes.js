const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/adjustmentController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateAdjustment } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), adjustmentController.getAllAdjustments);
router.get('/:id', requireRole('admin', 'manager', 'staff'), adjustmentController.getAdjustment);
router.post('/', requireRole('admin', 'manager', 'staff'), validateAdjustment, adjustmentController.createAdjustment);
router.put('/:id', requireRole('admin', 'manager'), validateAdjustment, adjustmentController.updateAdjustment);
router.patch('/:id/confirm', requireRole('admin', 'manager'), adjustmentController.confirmAdjustment);
router.patch('/:id/cancel', requireRole('admin', 'manager'), adjustmentController.cancelAdjustment);

module.exports = router;
