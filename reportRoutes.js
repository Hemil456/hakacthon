const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/stock-summary', requireRole('admin', 'manager'), reportController.stockSummary);
router.get('/ledger', requireRole('admin', 'manager'), reportController.ledgerReport);
router.get('/low-stock', requireRole('admin', 'manager', 'staff'), reportController.lowStockReport);
router.get('/valuation', requireRole('admin', 'manager'), reportController.valuationReport);

module.exports = router;
