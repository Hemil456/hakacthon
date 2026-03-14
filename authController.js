const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await authService.register({ name, email, password, role });
    logger.info(`New user registered: ${email}`);
    res.status(201).json({ success: true, message: 'Account created successfully.', data: { user } });
  } catch (err) {
    logger.error(`register controller error: ${err.message}`);
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login({ email, password });
    res.status(200).json({ success: true, message: 'Login successful.', data: { accessToken, refreshToken, user } });
  } catch (err) {
    logger.error(`login controller error: ${err.message}`);
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError('Refresh token is required.', 400));
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({ success: true, message: 'Access token refreshed.', data: { accessToken } });
  } catch (err) {
    logger.error(`refresh controller error: ${err.message}`);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id);
    res.status(200).json({ success: true, message: 'Logged out successfully.', data: null });
  } catch (err) {
    logger.error(`logout controller error: ${err.message}`);
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.status(200).json({ success: true, message: 'If that email is registered, an OTP has been sent.', data: null });
  } catch (err) {
    logger.error(`forgotPassword controller error: ${err.message}`);
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await authService.verifyOtp({ email, otp });
    res.status(200).json({ success: true, message: 'OTP verified successfully.', data: null });
  } catch (err) {
    logger.error(`verifyOtp controller error: ${err.message}`);
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    await authService.resetPassword({ email, otp, password });
    res.status(200).json({ success: true, message: 'Password reset successfully.', data: null });
  } catch (err) {
    logger.error(`resetPassword controller error: ${err.message}`);
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Authenticated user retrieved.', data: { user: req.user } });
  } catch (err) {
    logger.error(`getMe controller error: ${err.message}`);
    next(err);
  }
};

module.exports = { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword, getMe };
