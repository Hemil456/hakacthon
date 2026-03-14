const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateReceipt } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), receiptController.getAllReceipts);
router.get('/:id', requireRole('admin', 'manager', 'staff'), receiptController.getReceipt);
router.post('/', requireRole('admin', 'manager', 'staff'), validateReceipt, receiptController.createReceipt);
router.put('/:id', requireRole('admin', 'manager'), validateReceipt, receiptController.updateReceipt);
router.patch('/:id/confirm', requireRole('admin', 'manager'), receiptController.confirmReceipt);
router.patch('/:id/cancel', requireRole('admin', 'manager'), receiptController.cancelReceipt);

module.exports = router;
