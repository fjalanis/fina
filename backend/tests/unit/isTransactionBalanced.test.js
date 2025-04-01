const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup test database
setupDB();

describe('Transaction.isBalanced virtual property', () => {
  let account;
  
  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    
    account = await Account.create({
      name: 'Test Account',
      type: 'asset'
    });
  });
  
  it('should return false for a transaction with no entries', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: []
    });
    
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false for a transaction with only debits', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 100,
          type: 'debit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false for a transaction with only credits', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 100,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return false when debits do not equal credits', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 100,
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: 90,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should return true when total debits equal total credits', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 100,
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: 100,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle floating point amounts correctly', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 10.25,
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: 10.25,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle JavaScript floating point precision issues', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: 0.1,
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: 0.2,
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: 0.3,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
  });
  
  it('should handle type conversion correctly', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          accountId: account._id,
          amount: '100',
          type: 'debit'
        },
        {
          accountId: account._id,
          amount: '100',
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
  });
}); 