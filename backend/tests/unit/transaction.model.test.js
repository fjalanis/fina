const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup fresh database for each test
setupDB();

describe('Transaction Model', () => {
  let account;
  
  beforeEach(async () => {
    // Create test account for use in entries
    account = await Account.create({
      name: 'Test Account',
      type: 'asset'
    });
  });
  
  it('should create a transaction with entries', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'debit'
        },
        {
          account: account._id,
          amount: 100,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.entries).toHaveLength(2);
    expect(transaction.entries[0].amount).toBe(100);
    expect(transaction.entries[0].type).toBe('debit');
    expect(transaction.entries[1].amount).toBe(100);
    expect(transaction.entries[1].type).toBe('credit');
  });
  
  it('should calculate isBalanced correctly', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'debit'
        },
        {
          account: account._id,
          amount: 100,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
    
    // Add an unbalanced entry
    transaction.entries.push({
      account: account._id,
      amount: 50,
      type: 'debit'
    });
    
    await transaction.save();
    expect(transaction.isBalanced).toBe(false);
  });
  
  it('should update timestamps on save', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'debit'
        }
      ]
    });
    
    const createdAt = transaction.createdAt.getTime();
    const updatedAt = transaction.updatedAt.getTime();
    
    // Wait a bit longer to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update the transaction
    transaction.description = 'Updated Description';
    await transaction.save();
    
    // Verify createdAt hasn't changed
    expect(transaction.createdAt.getTime()).toBe(createdAt);
    
    // Verify updatedAt has increased
    const newUpdatedAt = transaction.updatedAt.getTime();
    expect(newUpdatedAt).toBeGreaterThan(updatedAt);
    expect(newUpdatedAt - updatedAt).toBeGreaterThanOrEqual(2000); // At least 2 seconds difference
  });
  
  it('should validate required fields', async () => {
    const transaction = new Transaction({
      // Missing required fields
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'debit'
        }
      ]
    });
    
    await expect(transaction.save()).rejects.toThrow();
  });
  
  it('should validate entry types', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'invalid' // Invalid type
        }
      ]
    });
    
    await expect(transaction.save()).rejects.toThrow();
  });
  
  it('should validate entry amounts', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: account._id,
          amount: -100, // Negative amount
          type: 'debit'
        }
      ]
    });
    
    await expect(transaction.save()).rejects.toThrow();
  });

  it('should handle floating point amounts correctly', async () => {
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Floating Point Transaction',
      entries: [
        {
          account: account._id,
          amount: 10.25,
          type: 'debit'
        },
        {
          account: account._id,
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
      description: 'Floating Point Precision Test',
      entries: [
        {
          account: account._id,
          amount: 0.1,
          type: 'debit'
        },
        {
          account: account._id,
          amount: 0.2,
          type: 'debit'
        },
        {
          account: account._id,
          amount: 0.3,
          type: 'credit'
        }
      ]
    });
    
    expect(transaction.isBalanced).toBe(true);
  });
}); 