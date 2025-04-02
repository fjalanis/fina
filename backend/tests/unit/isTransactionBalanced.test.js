const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup test database
setupDB();

describe('Transaction.isBalanced virtual property', () => {
  let assetAccount, incomeAccount, expenseAccount, stockAccount;
  
  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    
    assetAccount = await Account.create({ name: 'Checking', type: 'asset', unit: 'USD' });
    incomeAccount = await Account.create({ name: 'Salary', type: 'income', unit: 'USD' });
    expenseAccount = await Account.create({ name: 'Groceries', type: 'expense', unit: 'USD' });
    stockAccount = await Account.create({ name: 'AAPL', type: 'asset', unit: 'stock:AAPL' });
  });
  
  it('should return false for a transaction with no entries', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: []
    });
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false for a transaction with only debits', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: expenseAccount._id, amount: 100, type: 'debit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false for a transaction with only credits', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: incomeAccount._id, amount: 500, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false when debits do not equal credits', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: expenseAccount._id, amount: 100, type: 'debit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 99.99, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return true when total debits equal total credits', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: assetAccount._id, amount: 100, type: 'debit', unit: 'USD' },
        { accountId: incomeAccount._id, amount: 100, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle floating point amounts correctly', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: expenseAccount._id, amount: 50.75, type: 'debit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 50.75, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle JavaScript floating point precision issues', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: expenseAccount._id, amount: 0.1, type: 'debit', unit: 'USD' },
        { accountId: expenseAccount._id, amount: 0.2, type: 'debit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 0.3, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle type conversion correctly', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        { accountId: expenseAccount._id, amount: '100', type: 'debit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 100, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });

  it('should return true for a multi-unit transaction (implicitly balanced)', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Buy Stock',
      entries: [
        { accountId: stockAccount._id, amount: 10, type: 'debit', unit: 'stock:AAPL' },
        { accountId: assetAccount._id, amount: 1500, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });

  it('should return true for a multi-unit transaction with multiple entries of same unit', () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Buy Stock with Fee',
      entries: [
        { accountId: stockAccount._id, amount: 10, type: 'debit', unit: 'stock:AAPL' },
        { accountId: assetAccount._id, amount: 1500, type: 'credit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 5, type: 'credit', unit: 'USD' }
      ]
    });
    expect(transaction.isBalanced).toBe(true);
  });
}); 