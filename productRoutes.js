const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateProduct } = require('../utils/validators');

router.use(protect);

router.get('/', requireRole('admin', 'manager', 'staff'), productController.getAllProducts);
router.get('/:id', requireRole('admin', 'manager', 'staff'), productController.getProduct);
router.post('/', requireRole('admin', 'manager'), validateProduct, productController.createProduct);
router.put('/:id', requireRole('admin', 'manager'), validateProduct, productController.updateProduct);
router.patch('/:id', requireRole('admin', 'manager'), productController.updateProduct);
router.delete('/:id', requireRole('admin'), productController.deleteProduct);

module.exports = router;
