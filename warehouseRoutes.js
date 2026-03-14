const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateWarehouse } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), warehouseController.getAllWarehouses);
router.get('/:id', requireRole('admin', 'manager', 'staff'), warehouseController.getWarehouse);
router.post('/', requireRole('admin'), validateWarehouse, warehouseController.createWarehouse);
router.put('/:id', requireRole('admin'), validateWarehouse, warehouseController.updateWarehouse);
router.patch('/:id', requireRole('admin'), warehouseController.updateWarehouse);
router.delete('/:id', requireRole('admin'), warehouseController.deleteWarehouse);

module.exports = router;
