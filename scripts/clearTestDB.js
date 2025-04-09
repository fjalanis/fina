const Account = require('../backend/src/models/Account');
const Transaction = require('../backend/src/models/Transaction');
const Rule = require('../backend/src/models/Rule');
const AssetPrice = require('../backend/src/models/AssetPrice');
const connectDB = require('../backend/src/config/database');
const logger = require('../backend/src/config/logger');

// Clear all existing data
const clearAllData = async () => {
  logger.info('Clearing existing data...');
  await Transaction.deleteMany({});
  await Account.deleteMany({});
  await Rule.deleteMany({});
  await AssetPrice.deleteMany({});
  logger.info('All data cleared');
};

// Main function to clear the database
const clearTestDB = async () => {
  try {
    await connectDB();
    await clearAllData();
    logger.info('Test database cleared successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error clearing test database:', error);
    process.exit(1);
  }
};

clearTestDB(); 