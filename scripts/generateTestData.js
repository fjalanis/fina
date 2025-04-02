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

// Generate Cypress test data
const generateCypressTestData = async (accounts) => {
  logger.info('Generating Cypress test data...');
  
  // Create test accounts for Cypress
  const cypressTestAccount = await Account.create({
    name: 'Cypress Test Account',
    type: 'asset',
    description: 'Account for Cypress testing',
    unit: 'USD'
  });

  const cypressStockAccount = await Account.create({
    name: 'Cypress Stock Account',
    type: 'asset',
    description: 'Stock account for Cypress testing',
    unit: 'AAPL'
  });

  const cypressCryptoAccount = await Account.create({
    name: 'Cypress Crypto Account',
    type: 'asset',
    description: 'Crypto account for Cypress testing',
    unit: 'BTC'
  });

  // Create test transactions for Cypress
  const cypressDate = new Date(2025, 0, 1); // Jan 1, 2025

  // Initial balance for test account
  await Transaction.create({
    date: cypressDate,
    description: 'Initial balance for Cypress test account',
    isBalanced: true,
    entries: [
      {
        accountId: cypressTestAccount._id,
        amount: 1000,
        type: 'debit',
        unit: 'USD'
      },
      {
        accountId: accounts.openingBalance._id,
        amount: 1000,
        type: 'credit',
        unit: 'USD'
      }
    ]
  });

  // Stock purchase transaction
  await Transaction.create({
    date: cypressDate,
    description: 'Stock purchase for Cypress testing',
    isBalanced: true,
    entries: [
      {
        accountId: cypressStockAccount._id,
        amount: 1000,
        type: 'debit',
        unit: 'AAPL',
        quantity: 5
      },
      {
        accountId: accounts.checkingAccount._id,
        amount: 1000,
        type: 'credit',
        unit: 'USD'
      }
    ]
  });

  // Crypto purchase transaction
  await Transaction.create({
    date: cypressDate,
    description: 'Crypto purchase for Cypress testing',
    isBalanced: true,
    entries: [
      {
        accountId: cypressCryptoAccount._id,
        amount: 500,
        type: 'debit',
        unit: 'BTC',
        quantity: 0.1
      },
      {
        accountId: accounts.checkingAccount._id,
        amount: 500,
        type: 'credit',
        unit: 'USD'
      }
    ]
  });

  // Stock sale with gain
  await Transaction.create({
    date: new Date(2025, 0, 15),
    description: 'Stock sale with gain for Cypress testing',
    isBalanced: true,
    entries: [
      {
        accountId: cypressStockAccount._id,
        amount: 1200,
        type: 'credit',
        unit: 'AAPL',
        quantity: 5
      },
      {
        accountId: accounts.checkingAccount._id,
        amount: 1200,
        type: 'debit',
        unit: 'USD'
      },
      {
        accountId: accounts.investmentIncome._id,
        amount: 200,
        type: 'credit',
        unit: 'USD',
        description: 'Capital gain'
      }
    ]
  });

  // Crypto sale with loss
  await Transaction.create({
    date: new Date(2025, 0, 20),
    description: 'Crypto sale with loss for Cypress testing',
    isBalanced: true,
    entries: [
      {
        accountId: cypressCryptoAccount._id,
        amount: 400,
        type: 'credit',
        unit: 'BTC',
        quantity: 0.1
      },
      {
        accountId: accounts.checkingAccount._id,
        amount: 400,
        type: 'debit',
        unit: 'USD'
      },
      {
        accountId: accounts.investmentIncome._id,
        amount: 100,
        type: 'debit',
        unit: 'USD',
        description: 'Capital loss'
      }
    ]
  });

  logger.info('Cypress test data generated');
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
      parent: accounts.groceries._id,
      unit: 'USD'
    });
    
    // Add office supplies account for the balancing test transactions
    const officeSupplies = await Account.create({
      name: 'Office Supplies',
      type: 'expense',
      description: 'Office supplies and equipment',
      parent: accounts.groceries._id,
      unit: 'USD'
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
      'debit',
      'USD'
    );
    
    // Add some additional unbalanced transactions with specific edge cases
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 10),
      "[UNMATCHED-CREDIT] Credit without matching debit - needs any debit $123.45",
      accounts.visaCard._id,
      123.45,
      'credit',
      'USD'
    );
    
    // Create a very small amount transaction to test minimum thresholds
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 20),
      "[SMALL-AMOUNT-DEBIT] Very small unbalanced transaction - needs credit $0.01",
      accounts.checkingAccount._id,
      0.01,
      'debit',
      'USD'
    );
    
    // Create a large amount transaction to test maximum thresholds
    await utils.createImbalancedTransaction(
      new Date(2025, 1, 25),
      "[LARGE-AMOUNT-CREDIT] Large unbalanced transaction - needs debit $9999.99",
      accounts.savingsAccount._id,
      9999.99,
      'credit',
      'USD'
    );
    
    // Add complementary unbalanced transactions for testing the balancing feature
    await utils.createBalancingTestTransactions(accounts);
    
    // Create unbalanced transactions with specific patterns for rule testing
    await utils.createPatternsForRuleTesting(accounts);
    
    // Create sample rules (disabled by default)
    await ruleGenerator.createSampleRules(accounts);

    // Generate Cypress test data
    await generateCypressTestData(accounts);
    
    logger.info('Test data generation complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Error generating test data:', error);
    process.exit(1);
  }
};

generateTestData(); 