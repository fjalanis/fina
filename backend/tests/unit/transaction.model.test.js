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

  it('should correctly identify a balanced transaction', async () => {
    // Create transaction
    const transaction = new Transaction({
      date: new Date(),
      description: 'Balanced Transaction Test'
    });
    const savedTransaction = await transaction.save();
    console.log('Transaction created with ID:', savedTransaction._id);

    // Create expense and asset accounts for the test if they don't exist yet
    if (!expenseAccount) {
      expenseAccount = await Account.create({
        name: 'Expense Account for Transaction Test',
        type: 'expense'
      });
    }
    
    if (!assetAccount) {
      assetAccount = await Account.create({
        name: 'Asset Account for Transaction Test',
        type: 'asset'
      });
    }

    // Create balanced entry lines (debit and credit of same amount)
    const debitEntry = new EntryLine({
      transaction: savedTransaction._id,
      account: expenseAccount._id,
      description: 'Debit entry',
      amount: 100,
      type: 'debit'
    });

    const creditEntry = new EntryLine({
      transaction: savedTransaction._id,
      account: assetAccount._id,
      description: 'Credit entry',
      amount: 100,
      type: 'credit'
    });

    // Save entry lines sequentially to avoid race conditions
    await debitEntry.save();
    await creditEntry.save();

    // Wait a moment for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify the transaction still exists
    const refetchedTransaction = await Transaction.findById(savedTransaction._id);
    expect(refetchedTransaction).not.toBeNull();

    // Test directly with EntryLine.find rather than going through the transaction
    const entryLines = await EntryLine.find({ transaction: savedTransaction._id });
    expect(entryLines.length).toBe(2);
    
    let total = 0;
    entryLines.forEach(entry => {
      if (entry.type === 'debit') {
        total += entry.amount;
      } else {
        total -= entry.amount;
      }
    });
    
    // A balanced transaction should have a total of 0
    expect(Math.abs(total)).toBeLessThan(0.001);
    
    // Verify the transaction's isBalanced flag
    const updatedTransaction = await Transaction.findById(savedTransaction._id);
    expect(updatedTransaction).not.toBeNull();
    expect(updatedTransaction.isBalanced).toBe(true);
  });

  it('should identify an unbalanced transaction', async () => {
    // Create transaction
    const transaction = new Transaction({
      date: new Date(),
      description: 'Unbalanced Transaction Test'
    });
    await transaction.save();

    // Create unbalanced entry lines (debit and credit of different amounts)
    const debitEntry = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      description: 'Debit entry',
      amount: 100,
      type: 'debit'
    });

    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      description: 'Credit entry',
      amount: 75,
      type: 'credit'
    });

    await debitEntry.save();
    await creditEntry.save();

    // Just directly test the isTransactionBalanced method
    await transaction.populate('entryLines');
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });

  it('should identify a transaction with no entry lines as unbalanced', async () => {
    // Create transaction without entry lines
    const transaction = new Transaction({
      date: new Date(),
      description: 'Empty Transaction'
    });
    await transaction.save();

    // Check if transaction is balanced
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
}); 