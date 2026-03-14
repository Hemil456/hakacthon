const Stock = require('../models/stockModel');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const increaseStock = async (productId, warehouseId, locationId, qty, session) => {
  try {
    await Stock.findOneAndUpdate(
      { product: productId, warehouse: warehouseId, location: locationId || null },
      { $inc: { quantity: qty } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true }
    );
  } catch (err) {
    logger.error(`increaseStock error: ${err.message}`);
    throw err;
  }
};

const decreaseStock = async (productId, warehouseId, locationId, qty, session) => {
  try {
    const stock = await Stock.findOne({
      product: productId,
      warehouse: warehouseId,
      location: locationId || null,
    }).session(session);

    if (!stock || stock.quantity < qty) {
      throw new AppError(
        `Insufficient stock for product ${productId}. Available: ${stock?.quantity || 0}, Required: ${qty}.`,
        409
      );
    }

    stock.quantity -= qty;
    await stock.save({ session });
  } catch (err) {
    logger.error(`decreaseStock error: ${err.message}`);
    throw err;
  }
};

const transferStock = async (fromWarehouseId, toWarehouseId, productId, qty, session) => {
  try {
    await decreaseStock(productId, fromWarehouseId, null, qty, session);
    await increaseStock(productId, toWarehouseId, null, qty, session);
  } catch (err) {
    logger.error(`transferStock error: ${err.message}`);
    throw err;
  }
};

module.exports = { increaseStock, decreaseStock, transferStock };
