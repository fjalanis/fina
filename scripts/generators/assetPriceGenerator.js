const AssetPrice = require('../../backend/src/models/AssetPrice');
const logger = require('../../backend/src/config/logger');

// Seed simple daily prices for a unit between start and end dates (inclusive)
exports.seedDailyPrices = async (unit, startDate, endDate, startRate, dailyDelta) => {
  logger.info(`Seeding prices for ${unit} from ${startDate.toISOString().slice(0,10)} to ${endDate.toISOString().slice(0,10)}`);
  const docs = [];
  let current = new Date(startDate);
  let rate = startRate;
  while (current <= endDate) {
    docs.push({ unit, rate: Math.round(rate * 100) / 100, date: new Date(current) });
    // Next day
    current.setDate(current.getDate() + 1);
    rate += dailyDelta;
  }
  if (docs.length) {
    await AssetPrice.insertMany(docs);
  }
  logger.info(`Inserted ${docs.length} ${unit} prices`);
};

// Seed a small set of prices for AAPL and BTC
exports.seedDefaultPrices = async () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  // AAPL around $190 trending slightly up
  await exports.seedDailyPrices('AAPL', start, today, 188, 0.3);

  // BTC around $45k trending slightly down
  await exports.seedDailyPrices('BTC', start, today, 46000, -150);
};

exports.clearAllPrices = async () => {
  await AssetPrice.deleteMany({});
};


