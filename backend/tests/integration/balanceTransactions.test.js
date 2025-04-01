const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const { setupDB } = require('../setup');

// Setup fresh database
setupDB();

describe('Balance Transactions API', () => {
  let assetAccount;
  let expenseAccount;
  let liabilityAccount;

  beforeAll(async () => {
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Bank Account',
      type: 'asset'
    });
    
    expenseAccount = await Account.create({
      name: 'Groceries',
      type: 'expense'
    });
    
    liabilityAccount = await Account.create({
      name: 'Credit Card',
      type: 'liability'
    });
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
  });

  describe('POST /api/transactions/balance', () => {
    it('successfully balances two unbalanced transactions', async () => {
      // Create first transaction with a single debit
      const transaction1 = await Transaction.create({
        date: new Date(),
        description: 'First transaction',
        isBalanced: false,
        entries: [
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });

      // Create second transaction with a single credit
      const transaction2 = await Transaction.create({
        date: new Date(),
        description: 'Second transaction',
        isBalanced: false,
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'credit'
          }
        ]
      });

      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceTransactionId: transaction1._id,
          targetTransactionId: transaction2._id
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();
      expect(res.body.data.transaction.isBalanced).toBe(true);
      
      // Verify source transaction now contains both entries
      const mergedTransaction = await Transaction.findById(transaction1._id);
      expect(mergedTransaction).not.toBeNull();
      expect(mergedTransaction.isBalanced).toBe(true);
      expect(mergedTransaction.entries.length).toBe(2);
      
      // Verify target transaction was deleted
      const deletedTransaction = await Transaction.findById(transaction2._id);
      expect(deletedTransaction).toBeNull();
    });

    it('balances transactions with multiple existing entries', async () => {
      // Create first transaction with multiple entries (partial balance)
      const transaction1 = await Transaction.create({
        date: new Date(),
        description: 'First transaction',
        isBalanced: false,
        entries: [
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'debit'
          },
          {
            accountId: liabilityAccount._id,
            amount: 50,
            type: 'credit'
          }
        ]
      });

      // Create second transaction with a single credit
      const transaction2 = await Transaction.create({
        date: new Date(),
        description: 'Second transaction',
        isBalanced: false,
        entries: [
          {
            accountId: assetAccount._id,
            amount: 50,
            type: 'credit'
          }
        ]
      });

      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceTransactionId: transaction1._id,
          targetTransactionId: transaction2._id
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();
      expect(res.body.data.transaction.isBalanced).toBe(true);
      
      // Verify source transaction now contains all entries
      const mergedTransaction = await Transaction.findById(transaction1._id);
      expect(mergedTransaction).not.toBeNull();
      expect(mergedTransaction.isBalanced).toBe(true);
      expect(mergedTransaction.entries.length).toBe(3); // 1 debit + 2 credits
      
      // Calculate totals to verify balance
      let totalDebits = 0;
      let totalCredits = 0;
      
      mergedTransaction.entries.forEach(entry => {
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
      const transaction1 = await Transaction.create({
        date: new Date(),
        description: 'First transaction',
        isBalanced: false,
        entries: [
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });
      
      const transaction2 = await Transaction.create({
        date: new Date(),
        description: 'Second transaction',
        isBalanced: false,
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit' // Same type as transaction1
          }
        ]
      });
      
      // Make API call to balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceTransactionId: transaction1._id,
          targetTransactionId: transaction2._id
        });
      
      // Check response - should be a 400 error
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Transactions must have opposite types to balance');
      
      // Verify both transactions still exist
      const transaction1AfterAttempt = await Transaction.findById(transaction1._id);
      const transaction2AfterAttempt = await Transaction.findById(transaction2._id);
      
      expect(transaction1AfterAttempt).not.toBeNull();
      expect(transaction2AfterAttempt).not.toBeNull();
    });

    it('should return 404 for non-existent transactions', async () => {
      const nonExistentId1 = new mongoose.Types.ObjectId();
      const nonExistentId2 = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceTransactionId: nonExistentId1,
          targetTransactionId: nonExistentId2
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('One or both transactions not found');
    });
  });

}); 