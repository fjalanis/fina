const Transaction = require('../../models/Transaction');
const logger = require('../../config/logger');

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
exports.createImbalancedTransaction = async (date, description, accountId, amount, type) => {
  logger.info(`Creating imbalanced transaction: ${description}`);
  
  const transaction = await Transaction.create({
    date,
    description,
    isBalanced: false,
    entries: [{
      account: accountId,
      amount,
      type,
      description
    }]
  });
  
  return transaction;
}; 