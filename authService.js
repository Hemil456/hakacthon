const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Role = require('../models/roleModel');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { sendWelcome, sendOtp } = require('./emailService');
const generateOtp = require('../utils/otpGenerator');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const register = async ({ name, email, password, role: roleId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) throw new AppError('An account with this email already exists.', 409);

    const role = await Role.findById(roleId).lean();
    if (!role) throw new AppError('Invalid role specified.', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await User.create([{ name, email, passwordHash, role: roleId }], { session });

    await session.commitTransaction();
    session.endSession();

    sendWelcome(email, name).catch((err) =>
      logger.error(`Welcome email failed for ${email}: ${err.message}`)
    );

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.otp;
    delete userObj.otpAttempts;
    delete userObj.refreshToken;
    return userObj;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`register error: ${err.message}`);
    throw err;
  }
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email })
    .select('+passwordHash +refreshToken')
    .populate('role')
    .lean({ virtuals: false });

  if (!user) throw new AppError('Invalid email or password.', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated. Contact administrator.', 403);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password.', 401);

  const payload = { id: user._id, role: user.role?.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  logger.info(`User logged in: ${email}`);
  return { accessToken, refreshToken, user: safeUser };
};

const refreshAccessToken = async (token) => {
  if (!token) throw new AppError('Refresh token is required.', 400);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken').populate('role').lean();
  if (!user) throw new AppError('User not found. Please log in again.', 401);
  if (user.refreshToken !== token) throw new AppError('Refresh token mismatch. Please log in again.', 401);
  if (!user.isActive) throw new AppError('Account deactivated.', 403);

  const payload = { id: user._id, role: user.role?.name };
  const newAccessToken = signAccessToken(payload);

  logger.info(`Access token refreshed for user: ${user.email}`);
  return { accessToken: newAccessToken };
};

const logout = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });
  logger.info(`User logged out: ${userId}`);
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`Forgot password attempted for non-existent email: ${email}`);
    return;
  }
  if (!user.isActive) throw new AppError('Account is deactivated. Contact administrator.', 403);

  const { raw, hashed } = await generateOtp();
  user.otp = hashed;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });
  await sendOtp(email, raw);
  logger.info(`OTP sent to ${email}`);
};

const verifyOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt +otpAttempts');
  if (!user) throw new AppError('Invalid email.', 400);
  if (!user.otp || !user.otpExpiresAt) throw new AppError('No OTP requested. Please request a new one.', 400);

  if (user.otpAttempts >= 3) {
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Too many failed attempts. Please request a new OTP.', 429);
  }

  if (user.otpExpiresAt < new Date()) {
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    const remaining = 3 - user.otpAttempts;
    throw new AppError(`Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 400);
  }

  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });
  logger.info(`OTP verified for: ${email}`);
};

const resetPassword = async ({ email, otp, password }) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt +otpAttempts +passwordHash');
  if (!user) throw new AppError('Invalid request.', 400);
  if (!user.otp || !user.otpExpiresAt) throw new AppError('OTP not found. Please request a new one.', 400);

  if (user.otpExpiresAt < new Date()) {
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) throw new AppError('Invalid OTP. Password not reset.', 400);

  user.passwordHash = await bcrypt.hash(password, 12);
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });
  logger.info(`Password reset successfully for: ${email}`);
};

module.exports = { register, login, refreshAccessToken, logout, forgotPassword, verifyOtp, resetPassword };
