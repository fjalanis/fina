const Account = require('../src/models/Account');
const Transaction = require('../src/models/Transaction');
const mongoose = require('mongoose');

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

// Helper function to clear all test data from the database
const clearTestData = async () => {
  await Transaction.deleteMany({});
  await Account.deleteMany({});
};

// Helper function to set up test data for report tests
const setupTestData = async () => {
  // Create account hierarchy
  const accounts = await createAccountHierarchy();
  
  // Create a test transaction (income: salary credit, checking debit)
  const incomeTransaction = await Transaction.create({
    date: new Date(),
    description: 'Test Income Transaction',
    reference: 'TEST-INC-001',
    isBalanced: true,
    entries: [
      {
        accountId: accounts.salary._id,
        amount: 2000,
        type: 'credit',
        description: 'Monthly salary'
      },
      {
        accountId: accounts.checkingAccount._id,
        amount: 2000,
        type: 'debit',
        description: 'Salary deposit'
      }
    ]
  });
  
  // Create a test transaction (expense: groceries debit, credit card credit)
  const expenseTransaction = await Transaction.create({
    date: new Date(),
    description: 'Test Expense Transaction',
    reference: 'TEST-EXP-001',
    isBalanced: true,
    entries: [
      {
        accountId: accounts.groceries._id,
        amount: 150,
        type: 'debit',
        description: 'Weekly groceries'
      },
      {
        accountId: accounts.visa._id,
        amount: 150,
        type: 'credit',
        description: 'Grocery purchase on credit card'
      }
    ]
  });
  
  return {
    accounts: Object.values(accounts),
    transactions: [incomeTransaction, expenseTransaction]
  };
};

module.exports = { 
  createAccountHierarchy, 
  createTestAccount,
  clearTestData,
  setupTestData
}; 