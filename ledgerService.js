const Ledger = require('../models/ledgerModel');
const Stock = require('../models/stockModel');
const logger = require('../utils/logger');

const recordEntry = async (
  { product, warehouse, type, referenceId, referenceModel, quantityChange, performedBy },
  session
) => {
  try {
    const stock = await Stock.findOne({ product, warehouse }).session(session).lean();
    const quantityAfter = stock ? stock.quantity : 0;

    await Ledger.create(
      [{ product, warehouse, transactionType: type, referenceId, referenceModel, quantityChange, quantityAfter, performedBy }],
      { session }
    );
  } catch (err) {
    logger.error(`ledgerService recordEntry error: ${err.message}`);
    throw err;
  }
};

module.exports = { recordEntry };
