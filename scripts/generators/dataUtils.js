const Transaction = require('../../backend/src/models/Transaction');
const logger = require('../../backend/src/config/logger');

// Helper to create a random date within a month
exports.getRandomDate = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(year, month - 1, day);
};

// Helper to add slight variation to amounts (±10%)
exports.varyAmount = (baseAmount) => {
  const variation = (Math.random() * 0.2) - 0.1; // -10% to +10%
  return Math.round((baseAmount * (1 + variation)) * 100) / 100;
};

// Helper to create imbalanced transactions with single entry
exports.createImbalancedTransaction = async (date, description, accountId, amount, type, unit = 'USD') => {
  logger.info(`Creating imbalanced transaction: ${description}`);
  
  const transaction = await Transaction.create({
    date,
    description,
    entries: [{
      accountId: accountId,
      amount,
      type,
      description,
      unit
    }]
  });
  
  return transaction;
};

// Helper to create a set of complementary unbalanced transactions
exports.createComplementaryTransactions = async (account1Id, account2Id, amount, description1, description2, date1, date2, unit = 'USD') => {
  logger.info(`Creating complementary unbalanced transactions for testing`);
  
  // First unbalanced transaction (debit)
  const transaction1 = await Transaction.create({
    date: date1,
    description: description1,
    entries: [{
      accountId: account1Id,
      amount,
      type: 'debit',
      description: description1,
      unit
    }]
  });
  
  // Second unbalanced transaction (credit)
  const transaction2 = await Transaction.create({
    date: date2,
    description: description2,
    entries: [{
      accountId: account2Id,
      amount,
      type: 'credit',
      description: description2,
      unit
    }]
  });
  
  return { transaction1, transaction2 };
};

// Creates a series of unbalanced transactions with specific patterns
exports.createPatternsForRuleTesting = async (accounts) => {
  logger.info('Creating unbalanced transactions with specific patterns for rule testing');
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  // Transactions for testing the edit rule (grocery stores)
  const groceryStores = ['Safeway', 'Kroger', 'Albertsons', 'Trader Joe\'s', 'Whole Foods Market'];
  const groceryAmounts = [76.45, 124.30, 89.75, 102.60, 156.20];
  
  for (let i = 0; i < groceryStores.length; i++) {
    const date = new Date(currentYear, currentMonth - 1, i + 5);
    await Transaction.create({
      date,
      description: `${groceryStores[i]} #${Math.floor(Math.random() * 999) + 100}`,
      entries: [{
        accountId: accounts.visaCard._id,
        amount: groceryAmounts[i],
        type: 'credit',
        description: `Purchase at ${groceryStores[i]}`,
        unit: 'USD'
      }]
    });
  }
  
  // Transactions for testing the merge rule (gas stations)
  const gasStations = ['Shell', 'Chevron', 'Exxon', 'BP', 'Mobil'];
  
  // Create multiple gas transactions on the same day
  const gasDate1 = new Date(currentYear, currentMonth - 1, 12);
  const gasDate2 = new Date(currentYear, currentMonth - 1, 12);
  
  await Transaction.create({
    date: gasDate1,
    description: `${gasStations[0]} Gas Station`,
    entries: [{
      accountId: accounts.amexCard._id,
      amount: 42.30,
      type: 'credit',
      description: 'Fuel purchase',
      unit: 'USD'
    }]
  });
  
  await Transaction.create({
    date: gasDate2,
    description: `${gasStations[1]} Gas Station`,
    entries: [{
      accountId: accounts.visaCard._id,
      amount: 38.75,
      type: 'credit',
      description: 'Fuel purchase',
      unit: 'USD'
    }]
  });
  
  // Transactions for testing the complementary rules
  
  // Utility bills without proper categorization
  const utilities = ['Electricity Bill', 'Water Bill', 'Internet Service'];
  const utilityAmounts = [187.45, 95.60, 135.20];
  
  for (let i = 0; i < utilities.length; i++) {
    const date = new Date(currentYear, currentMonth - 1, i + 15);
    await Transaction.create({
      date,
      description: utilities[i],
      entries: [{
        accountId: accounts.checkingAccount._id,
        amount: utilityAmounts[i],
        type: 'credit',
        description: `Monthly ${utilities[i]}`,
        unit: 'USD'
      }]
    });
  }
  
  // Restaurant transactions for auto-categorization testing
  const restaurants = [
    'Starbucks', 'McDonalds', 'Cheesecake Factory', 
    'Olive Garden', 'DoorDash - Thai Food', 'Uber Eats - Pizza'
  ];
  const restaurantAmounts = [8.75, 15.25, 78.50, 92.40, 34.60, 45.25];
  
  for (let i = 0; i < restaurants.length; i++) {
    const date = new Date(currentYear, currentMonth - 1, i + 8);
    await Transaction.create({
      date,
      description: restaurants[i],
      entries: [{
        accountId: accounts.visaCard._id,
        amount: restaurantAmounts[i],
        type: 'credit',
        description: `Purchase at ${restaurants[i]}`,
        unit: 'USD'
      }]
    });
  }
  
  logger.info('Created pattern transactions for rule testing');
};

// Create a group of unbalanced transactions that could balance each other for testing
exports.createBalancingTestTransactions = async (accounts) => {
  logger.info('Creating unbalanced transactions for balancing testing');
  
  const today2 = new Date();
  const currentYear = today2.getFullYear();
  const currentMonth = today2.getMonth() + 1;
  
  // Create sets of complementary transactions with various amounts
  const amounts = [250, 180.45, 1200, 25.99, 76.50];
  const dayOffsets = [0, 1, 2, 5, 10]; // Different date differences
  
  // Transaction descriptions with clear pairing identifiers
  const debitDescriptions = [
    '[PAIR-1-DEBIT] Mystery withdrawal - needs credit match',
    '[PAIR-2-DEBIT] ATM withdrawal - needs credit match',
    '[PAIR-3-DEBIT] Transfer to external account - needs credit match',
    '[PAIR-4-DEBIT] Cash withdrawal - needs credit match',
    '[PAIR-5-DEBIT] Unknown debit transaction - needs credit match'
  ];
  
  const creditDescriptions = [
    '[PAIR-1-CREDIT] Deposit from unknown source - matches debit',
    '[PAIR-2-CREDIT] ATM deposit - matches debit',
    '[PAIR-3-CREDIT] External account transfer - matches debit',
    '[PAIR-4-CREDIT] Cash deposit - matches debit',
    '[PAIR-5-CREDIT] Uncategorized credit - matches debit'
  ];
  
  for (let i = 0; i < amounts.length; i++) {
    const baseDate = new Date(currentYear, currentMonth - 1, 15);
    const date1 = new Date(baseDate);
    const date2 = new Date(baseDate);
    date2.setDate(date2.getDate() + dayOffsets[i]);
    
    // Create pair of complementary transactions
    await exports.createComplementaryTransactions(
      accounts.checkingAccount._id,
      accounts.checkingAccount._id,
      amounts[i],
      debitDescriptions[i],
      creditDescriptions[i],
      date1,
      date2,
      'USD'
    );
  }
  
  // Create more challenging test cases
  
  // 1. Exact amount but different accounts
  await exports.createComplementaryTransactions(
    accounts.checkingAccount._id,
    accounts.visaCard._id,
    350.00,
    '[PAIR-6-DEBIT] Payment to unknown vendor - different accounts',
    '[PAIR-6-CREDIT] Customer payment received - different accounts',
    new Date(currentYear, currentMonth - 1, 18),
    new Date(currentYear, currentMonth - 1, 19),
    'USD'
  );
  
  // 2. Exact amount but far apart dates (should still be findable but not suggested)
  await exports.createComplementaryTransactions(
    accounts.checkingAccount._id,
    accounts.savingsAccount._id,
    500.00,
    '[PAIR-7-DEBIT] Quarterly membership fee - distant dates',
    '[PAIR-7-CREDIT] Refund - duplicate charge - distant dates',
    new Date(currentYear, currentMonth - 1, 5),
    new Date(currentYear, currentMonth - 1, 28),
    'USD'
  );
  
  // 3. Multiple entries that would balance a single entry
  const baseAmount = 159.99;
  
  // Create unbalanced transaction with debit entry
  await Transaction.create({
    date: new Date(currentYear, currentMonth - 1, 22),
    description: '[MULTI-PART-1] Office supplies order - needs multiple credits totaling $159.99',
    entries: [{
      accountId: accounts.officeSupplies._id,
      amount: baseAmount,
      type: 'debit',
      description: 'Office supplies',
      unit: 'USD'
    }]
  });
  
  // Create multiple unbalanced transactions that would collectively balance it
  await Transaction.create({
    date: new Date(currentYear, currentMonth - 1, 22),
    description: '[MULTI-PART-2A] Office supplies payment - part 1 (60%) - matches with MULTI-PART-1',
    entries: [{
      accountId: accounts.checkingAccount._id,
      amount: baseAmount * 0.6, // 60% of the total
      type: 'credit',
      description: 'Partial payment',
      unit: 'USD'
    }]
  });
  
  await Transaction.create({
    date: new Date(currentYear, currentMonth - 1, 23),
    description: '[MULTI-PART-2B] Office supplies payment - part 2 (40%) - matches with MULTI-PART-1',
    entries: [{
      accountId: accounts.checkingAccount._id,
      amount: baseAmount * 0.4, // 40% of the total
      type: 'credit',
      description: 'Remaining payment',
      unit: 'USD'
    }]
  });
  
  logger.info('Created balancing test transactions');
}; 