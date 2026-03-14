const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validateCategory } = require('../utils/validators');

router.use(protect);

router.get('/tree', requireRole('admin', 'manager', 'staff'), categoryController.getCategoryTree);
router.get('/', requireRole('admin', 'manager', 'staff'), categoryController.getAllCategories);
router.get('/:id', requireRole('admin', 'manager', 'staff'), categoryController.getCategory);
router.post('/', requireRole('admin', 'manager'), validateCategory, categoryController.createCategory);
router.put('/:id', requireRole('admin', 'manager'), validateCategory, categoryController.updateCategory);
router.delete('/:id', requireRole('admin'), categoryController.deleteCategory);

module.exports = router;
