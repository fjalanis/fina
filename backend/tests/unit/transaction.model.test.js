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
  
  it('should find unbalanced transactions using aggregation', async () => {
    // Create a balanced transaction
    await Transaction.create({
      date: new Date(),
      description: 'Balanced Transaction',
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
    
    // Create an unbalanced transaction
    await Transaction.create({
      date: new Date(),
      description: 'Unbalanced Transaction',
      entries: [
        {
          account: account._id,
          amount: 100,
          type: 'debit'
        },
        {
          account: account._id,
          amount: 50,
          type: 'credit'
        }
      ]
    });
    
    // Use the aggregation method to find unbalanced transactions
    const unbalancedTransactions = await Transaction.findUnbalanced();
    
    // Should find only the unbalanced transaction
    expect(unbalancedTransactions.length).toBe(1);
    expect(unbalancedTransactions[0].description).toBe('Unbalanced Transaction');
    expect(unbalancedTransactions[0].balanceDifference).toBe(50);
  });
  
  it('should handle type conversion correctly', async () => {
    // Create transaction with string values for amounts
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'Type Conversion Test',
      entries: [
        {
          account: account._id,
          amount: '100.50', // String amount
          type: 'debit'
        },
        {
          account: account._id,
          amount: '100.50', // String amount
          type: 'credit'
        }
      ]
    });
    
    // Verify that the transaction is balanced (string amounts are correctly converted to numbers)
    expect(transaction.isBalanced).toBe(true);
    
    // Add an entry with mixed types
    transaction.entries.push({
      account: account._id,
      amount: 75, // Number
      type: 'debit'
    });
    
    await transaction.save();
    
    // Verify transaction is now unbalanced
    expect(transaction.isBalanced).toBe(false);
    
    // Test with the aggregation method
    const unbalancedTransactions = await Transaction.findUnbalanced();
    expect(unbalancedTransactions.some(tx => tx._id.toString() === transaction._id.toString())).toBe(true);
    
    // Restore balance with another string amount
    transaction.entries.push({
      account: account._id,
      amount: '75.00', // String amount
      type: 'credit'
    });
    
    await transaction.save();
    
    // Verify transaction is balanced again
    expect(transaction.isBalanced).toBe(true);
  });
}); 