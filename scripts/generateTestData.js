const Account = require('../backend/src/models/Account');
const Transaction = require('../backend/src/models/Transaction');
const connectDB = require('../backend/src/config/database');
const logger = require('../backend/src/config/logger');

const accountGenerator = require('./generators/accountGenerator');
const transactionGenerator = require('./generators/transactionGenerator');
const ruleGenerator = require('./generators/ruleGenerator');
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
    
    // Create additional accounts needed for testing
    // Add home office account for the complementary rule - use groceries as parent since we know it exists
    const homeOffice = await Account.create({
      name: 'Home Office',
      type: 'expense',
      description: 'Home office expenses (tax deductible)',
      parent: accounts.groceries._id
    });
    
    // Add office supplies account for the balancing test transactions
    const officeSupplies = await Account.create({
      name: 'Office Supplies',
      type: 'expense',
      description: 'Office supplies and equipment',
      parent: accounts.groceries._id
    });
    
    // Update accounts object with new accounts
    accounts.homeOffice = homeOffice;
    accounts.officeSupplies = officeSupplies;
    
    // Create initial account balances
    await transactionGenerator.createInitialBalances(accounts);
    
    // Generate transactions for multiple months
    const startMonth = 1; // January
    const startYear = 2025;
    
    // Generate transactions for 3 months
    for (let month = startMonth; month < startMonth + 3; month++) {
      await transactionGenerator.generateMonthlyTransactions(accounts, startYear, month);
    }
    
    // Create a simple imbalanced transaction for basic testing
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 15),
      "[UNMATCHED-DEBIT] Intentionally imbalanced transaction - needs any credit $500",
      accounts.checkingAccount._id,
      500,
      'debit'
    );
    
    // Add some additional unbalanced transactions with specific edge cases
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 10),
      "[UNMATCHED-CREDIT] Credit without matching debit - needs any debit $123.45",
      accounts.visaCard._id,
      123.45,
      'credit'
    );
    
    // Create a very small amount transaction to test minimum thresholds
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 20),
      "[SMALL-AMOUNT-DEBIT] Very small unbalanced transaction - needs credit $0.01",
      accounts.checkingAccount._id,
      0.01,
      'debit'
    );
    
    // Create a large amount transaction to test maximum thresholds
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 25),
      "[LARGE-AMOUNT-CREDIT] Large unbalanced transaction - needs debit $9999.99",
      accounts.savingsAccount._id,
      9999.99,
      'credit'
    );
    
    // Add complementary unbalanced transactions for testing the balancing feature
    await utils.createBalancingTestTransactions(accounts);
    
    // Create unbalanced transactions with specific patterns for rule testing
    await utils.createPatternsForRuleTesting(accounts);
    
    // Create sample rules (disabled by default)
    await ruleGenerator.createSampleRules(accounts);
    
    logger.info('Test data generation complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Error generating test data:', error);
    process.exit(1);
  }
};

generateTestData(); 