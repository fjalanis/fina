const Rule = require('../../backend/src/models/Rule');
const logger = require('../../backend/src/config/logger');

/**
 * Creates sample rules for testing all rule types
 * 
 * @param {Object} accounts - Object containing account references
 * @returns {Object} - Created rules
 */
exports.createSampleRules = async (accounts) => {
  logger.info('Creating sample rules for testing...');
  
  // 1. Create Edit Rule - Changes grocery store names
  const editRule = await Rule.create({
    name: 'Standardize Grocery Store Names',
    description: 'Renames various grocery store transactions to a standard name',
    pattern: '(Safeway|Kroger|Albertsons|Trader Joe|Whole Foods)',
    sourceAccounts: [accounts.checkingAccount._id, accounts.visaCard._id],
    entryType: 'credit',
    autoApply: false,
    type: 'edit',
    newDescription: 'Grocery Shopping'
  });
  
  // 2. Create Merge Rule - Combines gas station purchases on same day
  const mergeRule = await Rule.create({
    name: 'Combine Gas Station Purchases',
    description: 'Merges multiple gas station transactions that occur on the same day',
    pattern: '(Gas|Shell|Chevron|Exxon|Mobil|BP)',
    sourceAccounts: [accounts.visaCard._id, accounts.amexCard._id],
    entryType: 'credit',
    autoApply: false,
    type: 'merge',
    maxDateDifference: 1 // Same day or next day
  });
  
  // 3. Create Complementary Rule - Split utility payments
  const complementaryRule = await Rule.create({
    name: 'Split Utility Payments',
    description: 'Splits utility payments between housing and tax-deductible home office expense',
    pattern: '(Electricity|Water|Internet)',
    sourceAccounts: [accounts.checkingAccount._id],
    entryType: 'credit',
    autoApply: false,
    type: 'complementary',
    destinationAccounts: [
      {
        accountId: accounts.electricity._id, // Using electricity instead of generic utilities
        ratio: 0.8 // 80% to regular utilities
      },
      {
        accountId: accounts.homeOffice._id,
        ratio: 0.2 // 20% to home office (tax deductible)
      }
    ]
  });
  
  // 4. Create Complementary Rule - Auto-categorize restaurants
  const restaurantRule = await Rule.create({
    name: 'Categorize Restaurant Expenses',
    description: 'Automatically categorizes restaurant and food delivery expenses',
    pattern: '(Restaurant|Cafe|Starbucks|McDonalds|Uber Eats|DoorDash|Grubhub)',
    sourceAccounts: [accounts.visaCard._id, accounts.amexCard._id],
    entryType: 'credit',
    autoApply: false,
    type: 'complementary',
    destinationAccounts: [
      {
        accountId: accounts.diningOut._id,
        ratio: 1.0 // 100% to dining out
      }
    ]
  });
  
  logger.info('Sample rules created successfully');
  
  return {
    editRule,
    mergeRule,
    complementaryRule,
    restaurantRule
  };
}; 