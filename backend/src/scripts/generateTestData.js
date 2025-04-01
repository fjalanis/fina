const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const connectDB = require('../config/database');
const logger = require('../config/logger');
const accountGenerator = require('./generators/accountGenerator');
const transactionGenerator = require('./generators/transactionGenerator');
const utils = require('./generators/dataUtils');

// Clear all existing data
const clearAllData = async () => {
  logger.info('Clearing existing data...');
  await Transaction.deleteMany({});
  await Account.deleteMany({});
  logger.info('All data cleared');
};

// Generate test data
const generateTestData = async () => {
  try {
    await connectDB();
    await clearAllData();
    
    // Create account structure
    const accounts = await accountGenerator.createAccountHierarchy();
    
    // Create initial account balances
    await transactionGenerator.createInitialBalances(accounts);
    
    // Generate transactions for multiple months
    const startMonth = 1; // January
    const startYear = 2023;
    
    // Generate transactions for 3 months
    for (let month = startMonth; month < startMonth + 3; month++) {
      await transactionGenerator.generateMonthlyTransactions(accounts, startYear, month);
    }
    
    // Make one transaction imbalanced for testing
    await utils.createImbalancedTransaction(
      new Date(2023, 1, 15),
      "Intentionally imbalanced transaction",
      accounts.checkingAccount._id,
      500,
      'debit'
    );
    
    logger.info('Test data generation complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Error generating test data:', error);
    process.exit(1);
  }
};

generateTestData(); 