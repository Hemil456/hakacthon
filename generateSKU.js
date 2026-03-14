const Product = require('../models/productModel');

const generateSKU = async (categoryName) => {
  const prefix = categoryName
    ? categoryName.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    : 'GEN';

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku;
  let exists = true;

  while (exists) {
    const random = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
    sku = `${prefix}-${random}`;
    exists = await Product.exists({ sku });
  }

  return sku;
};

module.exports = generateSKU;
