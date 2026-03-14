const { sendOtpEmail, sendWelcomeEmail } = require('../config/mailer');
const logger = require('../utils/logger');

const sendOtp = async (email, otp) => {
  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    logger.error(`emailService sendOtp error: ${err.message}`);
    throw err;
  }
};

const sendWelcome = async (email, name) => {
  try {
    await sendWelcomeEmail(email, name);
  } catch (err) {
    logger.error(`emailService sendWelcome error: ${err.message}`);
  }
};

module.exports = { sendOtp, sendWelcome };
