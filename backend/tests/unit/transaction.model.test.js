const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup a fresh database before each test
setupDB();

describe('Transaction Model', () => {
  let assetAccount;
  let expenseAccount;

  beforeEach(async () => {
    // Create test accounts
    assetAccount = new Account({
      name: 'Bank Account',
      type: 'asset',
      description: 'Test asset account'
    });

    expenseAccount = new Account({
      name: 'Groceries',
      type: 'expense',
      description: 'Test expense account'
    });

    await assetAccount.save();
    await expenseAccount.save();
  });

  it('should create and save a transaction successfully', async () => {
    const transactionData = {
      date: new Date('2023-01-01'),
      description: 'Grocery shopping',
      reference: 'SHOP123',
      notes: 'Weekly groceries'
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    // Verify saved transaction
    expect(savedTransaction._id).toBeDefined();
    expect(savedTransaction.date).toEqual(transactionData.date);
    expect(savedTransaction.description).toBe(transactionData.description);
    expect(savedTransaction.reference).toBe(transactionData.reference);
    expect(savedTransaction.notes).toBe(transactionData.notes);
    expect(savedTransaction.isBalanced).toBe(false);
  });

  it('should require a description for a transaction', async () => {
    const transaction = new Transaction({
      date: new Date()
    });

    let error;
    try {
      await transaction.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.description).toBeDefined();
  });

  it('should detect an unbalanced transaction', async () => {
    // Create a transaction with a single debit entry
    const transaction = new Transaction({
      date: new Date(),
      description: 'Unbalanced Transaction',
      reference: 'UNBAL001'
    });
    
    await transaction.save();
    
    // Add a single entry line
    const entryLine = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 100,
      type: 'debit'
    });
    
    await entryLine.save();
    
    // Reload transaction to check balance
    const updatedTransaction = await Transaction.findById(transaction._id);
    
    // Transaction should be unbalanced
    expect(updatedTransaction.isBalanced).toBe(false);
    
    // Check isTransactionBalanced method
    const isBalanced = await updatedTransaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
  
  it('should detect a balanced transaction', async () => {
    // Create a transaction
    const transaction = new Transaction({
      date: new Date(),
      description: 'Balanced Transaction',
      reference: 'BAL001'
    });
    
    await transaction.save();
    
    // Add two entry lines that balance each other
    const debitEntry = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 100,
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 100,
      type: 'credit'
    });
    
    await debitEntry.save();
    await creditEntry.save();
    
    // Reload transaction to check balance
    const updatedTransaction = await Transaction.findById(transaction._id);
    
    // Transaction should be balanced
    expect(updatedTransaction.isBalanced).toBe(true);
    
    // Check isTransactionBalanced method
    const isBalanced = await updatedTransaction.isTransactionBalanced();
    expect(isBalanced).toBe(true);
  });
}); 