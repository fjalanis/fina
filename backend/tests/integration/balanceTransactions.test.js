const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const { setupDB } = require('../setup');

// Setup fresh database
setupDB();

describe('Balance Transactions API', () => {
  let assetAccount;
  let expenseAccount;
  let liabilityAccount;

  beforeEach(async () => {
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Test Bank Account',
      type: 'asset',
      description: 'Test asset account'
    });

    expenseAccount = await Account.create({
      name: 'Test Expense',
      type: 'expense',
      description: 'Test expense account'
    });
    
    liabilityAccount = await Account.create({
      name: 'Test Credit Card',
      type: 'liability',
      description: 'Test liability account'
    });
  });

  describe('POST /api/transactions/balance', () => {
    it('successfully balances two unbalanced transactions', async () => {
      // Create first transaction with a single debit
      const transaction1 = new Transaction({
        date: new Date(),
        description: 'Restaurant purchase',
        isBalanced: false
      });
      await transaction1.save();
      
      const debitEntry = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await debitEntry.save();
      
      // Create second transaction with a single credit
      const transaction2 = new Transaction({
        date: new Date(),
        description: 'Credit card charge',
        isBalanced: false
      });
      await transaction2.save();
      
      const creditEntry = new EntryLine({
        transaction: transaction2._id,
        account: liabilityAccount._id,
        amount: 100,
        type: 'credit'
      });
      await creditEntry.save();
      
      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: debitEntry._id,
          targetEntryId: creditEntry._id
        });
      
      // Check status code and response
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();
      expect(res.body.data.transaction.isBalanced).toBe(true);
      
      // Verify source transaction now contains both entry lines
      const mergedTransaction = await Transaction.findById(transaction1._id).populate('entryLines');
      expect(mergedTransaction).not.toBeNull();
      expect(mergedTransaction.isBalanced).toBe(true);
      expect(mergedTransaction.entryLines.length).toBe(2);
      
      // Verify target transaction was deleted
      const deletedTransaction = await Transaction.findById(transaction2._id);
      expect(deletedTransaction).toBeNull();
      
      // Verify both entry lines now point to the source transaction
      const updatedDebitEntry = await EntryLine.findById(debitEntry._id);
      const updatedCreditEntry = await EntryLine.findById(creditEntry._id);
      
      expect(updatedDebitEntry.transaction.toString()).toBe(transaction1._id.toString());
      expect(updatedCreditEntry.transaction.toString()).toBe(transaction1._id.toString());
    });
    
    it('balances transactions with multiple existing entry lines', async () => {
      // Create first transaction with multiple entries (partial balance)
      const transaction1 = new Transaction({
        date: new Date(),
        description: 'Restaurant purchase',
        isBalanced: false
      });
      await transaction1.save();
      
      // First transaction has a debit of 100 and a credit of 50
      const debitEntry = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await debitEntry.save();
      
      const partialCreditEntry = new EntryLine({
        transaction: transaction1._id,
        account: assetAccount._id,
        amount: 50,
        type: 'credit'
      });
      await partialCreditEntry.save();
      
      // Create second transaction with the remaining credit
      const transaction2 = new Transaction({
        date: new Date(),
        description: 'Credit card charge',
        isBalanced: false
      });
      await transaction2.save();
      
      const remainingCreditEntry = new EntryLine({
        transaction: transaction2._id,
        account: liabilityAccount._id,
        amount: 50,
        type: 'credit'
      });
      await remainingCreditEntry.save();
      
      // Update transaction1's balance status
      transaction1.isBalanced = await transaction1.isTransactionBalanced();
      await transaction1.save();
      
      // Verify it's not balanced yet
      expect(transaction1.isBalanced).toBe(false);
      
      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: debitEntry._id,
          targetEntryId: remainingCreditEntry._id
        });
      
      // Check response
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.isBalanced).toBe(true);
      
      // Verify source transaction now contains all entry lines
      const mergedTransaction = await Transaction.findById(transaction1._id).populate('entryLines');
      expect(mergedTransaction).not.toBeNull();
      expect(mergedTransaction.isBalanced).toBe(true);
      expect(mergedTransaction.entryLines.length).toBe(3); // 1 debit + 2 credits
      
      // Calculate totals to verify balance
      let totalDebits = 0;
      let totalCredits = 0;
      
      mergedTransaction.entryLines.forEach(entry => {
        if (entry.type === 'debit') {
          totalDebits += entry.amount;
        } else {
          totalCredits += entry.amount;
        }
      });
      
      expect(totalDebits).toBe(100);
      expect(totalCredits).toBe(100);
      expect(totalDebits - totalCredits).toBe(0);
    });
    
    it('rejects balancing entries of the same type', async () => {
      // Create two transactions with same type entries
      const transaction1 = new Transaction({
        date: new Date(),
        description: 'First transaction',
        isBalanced: false
      });
      await transaction1.save();
      
      const debitEntry1 = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await debitEntry1.save();
      
      const transaction2 = new Transaction({
        date: new Date(),
        description: 'Second transaction',
        isBalanced: false
      });
      await transaction2.save();
      
      const debitEntry2 = new EntryLine({
        transaction: transaction2._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit' // Same type as debitEntry1
      });
      await debitEntry2.save();
      
      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: debitEntry1._id,
          targetEntryId: debitEntry2._id
        });
      
      // Check response - should be a 400 error
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Entries must have opposite types to balance');
      
      // Verify both transactions still exist
      const transaction1AfterAttempt = await Transaction.findById(transaction1._id);
      const transaction2AfterAttempt = await Transaction.findById(transaction2._id);
      
      expect(transaction1AfterAttempt).not.toBeNull();
      expect(transaction2AfterAttempt).not.toBeNull();
    });
    
    it('rejects balancing when both transactions are already balanced', async () => {
      // Create two balanced transactions
      const transaction1 = new Transaction({
        date: new Date(),
        description: 'First balanced transaction',
        isBalanced: true
      });
      await transaction1.save();
      
      const debitEntry1 = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await debitEntry1.save();
      
      const creditEntry1 = new EntryLine({
        transaction: transaction1._id,
        account: assetAccount._id,
        amount: 100,
        type: 'credit'
      });
      await creditEntry1.save();
      
      const transaction2 = new Transaction({
        date: new Date(),
        description: 'Second balanced transaction',
        isBalanced: true
      });
      await transaction2.save();
      
      const debitEntry2 = new EntryLine({
        transaction: transaction2._id,
        account: expenseAccount._id,
        amount: 50,
        type: 'debit'
      });
      await debitEntry2.save();
      
      const creditEntry2 = new EntryLine({
        transaction: transaction2._id,
        account: assetAccount._id,
        amount: 50,
        type: 'credit'
      });
      await creditEntry2.save();
      
      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: debitEntry1._id,
          targetEntryId: creditEntry2._id
        });
      
      // Check response - should be a 400 error
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Both transactions are already balanced');
    });
  });

  describe('GET /api/transactions/matches/:id', () => {
    it('finds matching entries for an unbalanced entry', async () => {
      // Create first transaction with a single debit (unbalanced)
      const transaction1 = new Transaction({
        date: new Date(),
        description: 'Restaurant purchase',
        isBalanced: false
      });
      await transaction1.save();
      
      const debitEntry = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 75,
        type: 'debit'
      });
      await debitEntry.save();
      
      // Update transaction balance status
      transaction1.isBalanced = await transaction1.isTransactionBalanced();
      await transaction1.save();
      
      // Create second transaction with a matching credit (unbalanced)
      const transaction2 = new Transaction({
        date: new Date(),
        description: 'Credit card charge',
        isBalanced: false
      });
      await transaction2.save();
      
      const creditEntry = new EntryLine({
        transaction: transaction2._id,
        account: liabilityAccount._id,
        amount: 75, // Same amount
        type: 'credit' // Opposite type
      });
      await creditEntry.save();
      
      // Update transaction balance status
      transaction2.isBalanced = await transaction2.isTransactionBalanced();
      await transaction2.save();
      
      // Create a third transaction that shouldn't match (different amount)
      const transaction3 = new Transaction({
        date: new Date(),
        description: 'Another transaction',
        isBalanced: false
      });
      await transaction3.save();
      
      const nonMatchingEntry = new EntryLine({
        transaction: transaction3._id,
        account: liabilityAccount._id,
        amount: 100, // Different amount
        type: 'credit'
      });
      await nonMatchingEntry.save();
      
      // Create a fourth balanced transaction that shouldn't match
      const transaction4 = new Transaction({
        date: new Date(),
        description: 'Balanced transaction',
        isBalanced: true
      });
      await transaction4.save();
      
      const balancedDebit = new EntryLine({
        transaction: transaction4._id,
        account: expenseAccount._id,
        amount: 75,
        type: 'debit'
      });
      await balancedDebit.save();
      
      const balancedCredit = new EntryLine({
        transaction: transaction4._id,
        account: liabilityAccount._id,
        amount: 75,
        type: 'credit'
      });
      await balancedCredit.save();
      
      // Update transaction balance status
      transaction4.isBalanced = await transaction4.isTransactionBalanced();
      await transaction4.save();
      
      // Query for matches for the debit entry
      const res = await request(app)
        .get(`/api/transactions/matches/${debitEntry._id}`)
        .query({ maxMatches: 10, dateRange: 30 });
      
      // Check response
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.targetEntry._id.toString()).toBe(debitEntry._id.toString());
      
      // Should find exactly one match (the creditEntry)
      expect(res.body.data.matches.length).toBe(1);
      expect(res.body.data.matches[0]._id.toString()).toBe(creditEntry._id.toString());
      
      // Verify it has the right properties
      const match = res.body.data.matches[0];
      expect(match.type).toBe('credit');
      expect(match.amount).toBe(75);
      expect(match.transaction._id.toString()).toBe(transaction2._id.toString());
    });
    
    it('returns 404 for non-existent entry line', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .get(`/api/transactions/matches/${nonExistentId}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Entry line not found');
    });
    
    it('returns 400 for entries from balanced transactions', async () => {
      // Create a balanced transaction
      const transaction = new Transaction({
        date: new Date(),
        description: 'Balanced transaction',
        isBalanced: true
      });
      await transaction.save();
      
      const debitEntry = new EntryLine({
        transaction: transaction._id,
        account: expenseAccount._id,
        amount: 50,
        type: 'debit'
      });
      await debitEntry.save();
      
      const creditEntry = new EntryLine({
        transaction: transaction._id,
        account: liabilityAccount._id,
        amount: 50,
        type: 'credit'
      });
      await creditEntry.save();
      
      // Update transaction balance status
      transaction.isBalanced = true;
      await transaction.save();
      
      // Try to get matches for an entry from a balanced transaction
      const res = await request(app)
        .get(`/api/transactions/matches/${debitEntry._id}`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Transaction is already balanced or does not exist');
    });
  });

  it('finds matching entries directly using amount and type parameters', async () => {
    // Create a transaction with a single debit (unbalanced)
    const transaction1 = new Transaction({
      date: new Date(),
      description: 'First transaction',
      isBalanced: false
    });
    await transaction1.save();
    
    const debitEntry = new EntryLine({
      transaction: transaction1._id,
      account: expenseAccount._id,
      amount: 50,
      type: 'debit'
    });
    await debitEntry.save();
    
    // Update transaction balance status
    transaction1.isBalanced = await transaction1.isTransactionBalanced();
    await transaction1.save();
    
    // Create another transaction with a matching credit
    const transaction2 = new Transaction({
      date: new Date(),
      description: 'Second transaction',
      isBalanced: false
    });
    await transaction2.save();
    
    const creditEntry = new EntryLine({
      transaction: transaction2._id,
      account: liabilityAccount._id,
      amount: 50, // Same amount
      type: 'credit' // Opposite type
    });
    await creditEntry.save();
    
    // Update transaction balance status
    transaction2.isBalanced = await transaction2.isTransactionBalanced();
    await transaction2.save();
    
    // Query for matches using direct parameters
    const res = await request(app)
      .get(`/api/transactions/matches/direct`)
      .query({ 
        amount: 50, 
        type: 'debit', 
        excludeTransactionId: transaction1._id.toString() 
      });
    
    // Check response
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    
    // Should find exactly one match (the creditEntry)
    expect(res.body.data.matches.length).toBe(1);
    expect(res.body.data.matches[0]._id.toString()).toBe(creditEntry._id.toString());
    
    // Verify it has the right properties
    const match = res.body.data.matches[0];
    expect(match.type).toBe('credit');
    expect(match.amount).toBe(50);
    expect(match.transaction._id.toString()).toBe(transaction2._id.toString());
  });
}); 