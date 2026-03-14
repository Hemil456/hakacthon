const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), stockController.getAllStock);
router.get('/low', requireRole('admin', 'manager', 'staff'), stockController.getLowStock);
router.get('/product/:productId', requireRole('admin', 'manager', 'staff'), stockController.getStockByProduct);
router.get('/warehouse/:warehouseId', requireRole('admin', 'manager', 'staff'), stockController.getStockByWarehouse);

module.exports = router;
