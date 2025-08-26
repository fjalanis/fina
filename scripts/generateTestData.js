const Account = require('../backend/src/models/Account');
const Transaction = require('../backend/src/models/Transaction');
const connectDB = require('../backend/src/config/database');
const logger = require('../backend/src/config/logger');

const accountGenerator = require('./generators/accountGenerator');
const transactionGenerator = require('./generators/transactionGenerator');
const ruleGenerator = require('./generators/ruleGenerator');
const assetPriceGenerator = require('./generators/assetPriceGenerator');
const utils = require('./generators/dataUtils');

// Clear all existing data
const clearAllData = async () => {
  logger.info('Clearing existing data...');
  await Transaction.deleteMany({});
  await Account.deleteMany({});
  await assetPriceGenerator.clearAllPrices();
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
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth() + 1; // current month
    
    // Generate transactions for last 2 months and current month
    const months = [startMonth - 2, startMonth - 1, startMonth].map(m => {
      if (m <= 0) return m + 12;
      return m;
    });
    const years = [startMonth - 2, startMonth - 1, startMonth].map((m, idx) => {
      if (m <= 0) return startYear - 1;
      return startYear;
    });
    for (let i = 0; i < months.length; i++) {
      await transactionGenerator.generateMonthlyTransactions(accounts, years[i], months[i]);
    }
    
    // Create a simple imbalanced transaction for basic testing
    await utils.createImbalancedTransaction(
      new Date(now.getFullYear(), now.getMonth(), 15),
      "[UNMATCHED-DEBIT] Intentionally imbalanced transaction - needs any credit $500",
      accounts.checkingAccount._id,
      500,
      'debit',
      'USD'
    );
    
    // Add some additional unbalanced transactions with specific edge cases
    await utils.createImbalancedTransaction(
      new Date(now.getFullYear(), now.getMonth(), 10),
      "[UNMATCHED-CREDIT] Credit without matching debit - needs any debit $123.45",
      accounts.visaCard._id,
      123.45,
      'credit',
      'USD'
    );
    
    // Create a very small amount transaction to test minimum thresholds
    await utils.createImbalancedTransaction(
      new Date(now.getFullYear(), now.getMonth(), 20),
      "[SMALL-AMOUNT-DEBIT] Very small unbalanced transaction - needs credit $0.01",
      accounts.checkingAccount._id,
      0.01,
      'debit',
      'USD'
    );
    
    // Create a large amount transaction to test maximum thresholds
    await utils.createImbalancedTransaction(
      new Date(now.getFullYear(), now.getMonth(), 25),
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

    // *** ADD INVALID PAIRING FOR TESTING ***
    logger.info('Creating intentionally invalid transaction pair for validation testing...');
    // Create a debit from Checking (that needs a credit)
    await Transaction.create({
      date: new Date(now.getFullYear(), now.getMonth(), 28),
      description: '[INVALID-DEBIT] Debit from Checking - should not merge with credit to Checking',
      entries: [{
        accountId: accounts.checkingAccount._id,
        amount: 55.55,
        type: 'debit',
        unit: 'USD'
      }]
    });
    // Create a credit to Checking (that needs a debit)
    await Transaction.create({
      date: new Date(now.getFullYear(), now.getMonth(), 29),
      description: '[INVALID-CREDIT] Credit to Checking - should not merge with debit from Checking',
      entries: [{
        accountId: accounts.checkingAccount._id,
        amount: 55.55,
        type: 'credit',
        unit: 'USD'
      }]
    });
    logger.info('Invalid transaction pair created.');
    // *** END INVALID PAIRING ***

    // Create sample rules (disabled by default)
    await ruleGenerator.createSampleRules(accounts);

    // Seed asset prices for units used
    await assetPriceGenerator.seedDefaultPrices();

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