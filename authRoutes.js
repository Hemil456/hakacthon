const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const { validateRegister, validateLogin, validateForgotPassword, validateVerifyOtp, validateResetPassword } = require('../utils/validators');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/verify-otp', validateVerifyOtp, authController.verifyOtp);
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);

module.exports = router;
