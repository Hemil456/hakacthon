const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateOtp = async () => {
  const raw = crypto.randomInt(100000, 999999).toString();
  const hashed = await bcrypt.hash(raw, 12);
  return { raw, hashed };
};

module.exports = generateOtp;
