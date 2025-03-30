const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup fresh database for each test
setupDB();

describe('Transaction.isTransactionBalanced method', () => {
  let assetAccount;
  let expenseAccount;
  
  beforeEach(async () => {
    // Create test accounts for use in entry lines
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
  
  test('should return false for a transaction with no entry lines', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Empty Transaction'
    });
    
    await transaction.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
  
  test('should return false for a transaction with only debits', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Debit Only Transaction'
    });
    
    await transaction.save();
    
    // Add only debit entries
    const entryLine1 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 100,
      type: 'debit'
    });
    
    const entryLine2 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 50,
      type: 'debit'
    });
    
    await entryLine1.save();
    await entryLine2.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
  
  test('should return false for a transaction with only credits', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Credit Only Transaction'
    });
    
    await transaction.save();
    
    // Add only credit entries
    const entryLine1 = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 75,
      type: 'credit'
    });
    
    const entryLine2 = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 25,
      type: 'credit'
    });
    
    await entryLine1.save();
    await entryLine2.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
  
  test('should return false when debits do not equal credits', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Unbalanced Transaction'
    });
    
    await transaction.save();
    
    // Add unbalanced entries
    const debitEntry = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 100,
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 75, // Less than the debit
      type: 'credit'
    });
    
    await debitEntry.save();
    await creditEntry.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(false);
  });
  
  test('should return true when total debits equal total credits', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Balanced Transaction'
    });
    
    await transaction.save();
    
    // Add balanced entries
    const debitEntry1 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 75,
      type: 'debit'
    });
    
    const debitEntry2 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 25,
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 100, // Equal to total debits
      type: 'credit'
    });
    
    await debitEntry1.save();
    await debitEntry2.save();
    await creditEntry.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(true);
  });
  
  test('should handle floating point amounts correctly', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Floating Point Transaction'
    });
    
    await transaction.save();
    
    // Add entries with floating point values
    const debitEntry = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 10.25,
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 10.25,
      type: 'credit'
    });
    
    await debitEntry.save();
    await creditEntry.save();
    
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(true);
  });
  
  test('should handle JavaScript floating point precision issues', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Floating Point Precision Test'
    });
    
    await transaction.save();
    
    // Create entries that might have floating point precision issues
    // 0.1 + 0.2 !== 0.3 in floating point arithmetic
    const debitEntry1 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 0.1,
      type: 'debit'
    });
    
    const debitEntry2 = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: 0.2,
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 0.3,
      type: 'credit'
    });
    
    await debitEntry1.save();
    await debitEntry2.save();
    await creditEntry.save();
    
    // Should still be balanced despite floating point issues
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(true);
  });
  
  test('should handle type conversion correctly', async () => {
    const transaction = new Transaction({
      date: new Date(),
      description: 'Type Conversion Test'
    });
    
    await transaction.save();
    
    // Create entries where amount is stored as string (might happen from forms)
    const debitEntry = new EntryLine({
      transaction: transaction._id,
      account: expenseAccount._id,
      amount: '100', // String value
      type: 'debit'
    });
    
    const creditEntry = new EntryLine({
      transaction: transaction._id,
      account: assetAccount._id,
      amount: 100, // Number value
      type: 'credit'
    });
    
    await debitEntry.save();
    await creditEntry.save();
    
    // Should convert types properly and balance
    const isBalanced = await transaction.isTransactionBalanced();
    expect(isBalanced).toBe(true);
  });
}); 