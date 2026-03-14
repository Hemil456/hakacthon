const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateTransfer } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), transferController.getAllTransfers);
router.get('/:id', requireRole('admin', 'manager', 'staff'), transferController.getTransfer);
router.post('/', requireRole('admin', 'manager', 'staff'), validateTransfer, transferController.createTransfer);
router.put('/:id', requireRole('admin', 'manager'), validateTransfer, transferController.updateTransfer);
router.patch('/:id/confirm', requireRole('admin', 'manager'), transferController.confirmTransfer);
router.patch('/:id/cancel', requireRole('admin', 'manager'), transferController.cancelTransfer);

module.exports = router;
