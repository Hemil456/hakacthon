const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const protect = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', requireRole('admin'), userController.getAllUsers);
router.get('/:id', requireRole('admin', 'manager'), userController.getUser);
router.patch('/:id', requireRole('admin'), userController.updateUser);
router.delete('/:id', requireRole('admin'), userController.deleteUser);

module.exports = router;
