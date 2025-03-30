const Account = require('../src/models/Account');

// Helper function to create a test account
const createTestAccount = async (accountData) => {
  const account = await Account.create(accountData);
  return account;
};

// Helper function to create multiple accounts with parent-child relationships
const createAccountHierarchy = async () => {
  // Create parent accounts for different types
  const assetParent = await Account.create({
    name: 'Assets',
    type: 'asset',
    description: 'Parent account for all assets'
  });

  const liabilityParent = await Account.create({
    name: 'Liabilities',
    type: 'liability',
    description: 'Parent account for all liabilities'
  });

  const incomeParent = await Account.create({
    name: 'Income',
    type: 'income',
    description: 'Parent account for all income'
  });

  const expenseParent = await Account.create({
    name: 'Expenses',
    type: 'expense',
    description: 'Parent account for all expenses'
  });

  // Create child accounts
  const bankAccount = await Account.create({
    name: 'Bank Accounts',
    type: 'asset',
    description: 'All bank accounts',
    parent: assetParent._id
  });

  const checkingAccount = await Account.create({
    name: 'Checking Account',
    type: 'asset',
    description: 'Main checking account',
    parent: bankAccount._id
  });

  const savingsAccount = await Account.create({
    name: 'Savings Account',
    type: 'asset',
    description: 'Emergency fund',
    parent: bankAccount._id
  });

  const creditCards = await Account.create({
    name: 'Credit Cards',
    type: 'liability',
    description: 'All credit card accounts',
    parent: liabilityParent._id
  });

  const visa = await Account.create({
    name: 'Visa',
    type: 'liability',
    description: 'Visa credit card',
    parent: creditCards._id
  });

  const salary = await Account.create({
    name: 'Salary',
    type: 'income',
    description: 'Employment income',
    parent: incomeParent._id
  });

  const groceries = await Account.create({
    name: 'Groceries',
    type: 'expense',
    description: 'Food and household supplies',
    parent: expenseParent._id
  });

  const utilities = await Account.create({
    name: 'Utilities',
    type: 'expense',
    description: 'Electricity, water, gas, etc.',
    parent: expenseParent._id
  });

  return {
    assetParent,
    liabilityParent,
    incomeParent,
    expenseParent,
    bankAccount,
    checkingAccount,
    savingsAccount,
    creditCards,
    visa,
    salary,
    groceries,
    utilities
  };
};

module.exports = { createAccountHierarchy, createTestAccount }; 