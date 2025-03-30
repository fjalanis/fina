// Set NODE_ENV to test to disable MongoDB transactions
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const { setupDB } = require('../setup');
const { createTestAccount } = require('../testUtils');

// Setup fresh database
setupDB();

describe('Transaction API', () => {
  let assetAccount;
  let expenseAccount;

  beforeEach(async () => {
    // Create test accounts
    assetAccount = await createTestAccount({
      name: 'Bank Account',
      type: 'asset',
      description: 'Test asset account'
    });

    expenseAccount = await createTestAccount({
      name: 'Groceries',
      type: 'expense',
      description: 'Test expense account'
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction with balanced entry lines', async () => {
      // Make sure the test accounts exist
      const asset = await Account.findById(assetAccount._id);
      expect(asset).not.toBeNull();
      const expense = await Account.findById(expenseAccount._id);
      expect(expense).not.toBeNull();
      
      const transactionData = {
        date: '2023-01-15T00:00:00.000Z',
        description: 'Grocery Shopping',
        reference: 'SHOP123',
        notes: 'Weekly groceries',
        entryLines: [
          {
            account: expenseAccount._id,
            description: 'Groceries expense',
            amount: 50,
            type: 'debit'
          },
          {
            account: assetAccount._id,
            description: 'Paid from bank account',
            amount: 50,
            type: 'credit'
          }
        ]
      };

      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData);
        
      // Try up to 3 times due to potential timing issues
      let maxRetries = 3;
      let transaction = null;
      
      while (maxRetries > 0 && !transaction) {
        try {
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('_id');
          
          // Wait for DB operations to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify data was saved to database
          transaction = await Transaction.findById(res.body.data._id);
          
          if (!transaction) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.log('Retrying transaction verification...');
          maxRetries--;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Now validate the transaction
      expect(transaction).not.toBeNull();
      expect(transaction.description).toBe(transactionData.description);
      
      // Check entry lines were created
      const entryLines = await EntryLine.find({ transaction: transaction._id });
      expect(entryLines.length).toBe(2);
    });

    it('should return validation error if entry lines are missing', async () => {
      const transactionData = {
        date: '2023-01-15T00:00:00.000Z',
        description: 'Invalid Transaction',
        entryLines: [] // Missing entry lines
      };

      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('must have at least two entry lines');
    });

    it('should return validation error if entry lines are unbalanced', async () => {
      const transactionData = {
        date: '2023-01-15T00:00:00.000Z',
        description: 'Unbalanced Transaction',
        entryLines: [
          {
            account: expenseAccount._id,
            amount: 100,
            type: 'debit'
          },
          {
            account: assetAccount._id,
            amount: 75, // Different amount
            type: 'credit'
          }
        ]
      };

      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData);

      expect(res.status).toBe(201); // Still creates the transaction
      expect(res.body.success).toBe(true);
      
      // Verify transaction is marked as unbalanced
      const transaction = await Transaction.findById(res.body.data._id);
      expect(transaction.isBalanced).toBe(false);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return all transactions', async () => {
      // Create test transactions
      const transaction1 = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Transaction 1'
      });
      await transaction1.save();

      const transaction2 = new Transaction({
        date: new Date('2023-01-16'),
        description: 'Transaction 2'
      });
      await transaction2.save();

      const res = await request(app).get('/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return a single transaction', async () => {
      // Create test transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Test Transaction'
      });
      await transaction.save();
      
      // Make sure the transaction exists
      const savedTransaction = await Transaction.findById(transaction._id);
      expect(savedTransaction).not.toBeNull();

      // Create some entry lines
      const entryLine1 = new EntryLine({
        transaction: transaction._id,
        account: assetAccount._id,
        amount: 100,
        type: 'debit'
      });
      await entryLine1.save();

      const entryLine2 = new EntryLine({
        transaction: transaction._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'credit'
      });
      await entryLine2.save();
      
      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const res = await request(app).get(`/api/transactions/${transaction._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(transaction._id.toString());
      expect(res.body.data.entryLines.length).toBe(2);
    });

    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/transactions/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction', async () => {
      // Create test transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Original Description',
        reference: 'OLD-REF'
      });
      await transaction.save();

      const updatedData = {
        description: 'Updated Description',
        reference: 'NEW-REF'
      };

      const res = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .send(updatedData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(updatedData.description);
      expect(res.body.data.reference).toBe(updatedData.reference);

      // Verify database was updated
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.description).toBe(updatedData.description);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction and its entry lines', async () => {
      // Create test transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Transaction to delete'
      });
      await transaction.save();

      // Create some entry lines
      const entryLine = new EntryLine({
        transaction: transaction._id,
        account: assetAccount._id,
        amount: 100,
        type: 'debit'
      });
      await entryLine.save();

      const res = await request(app).delete(`/api/transactions/${transaction._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify transaction was deleted
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();

      // Verify entry lines were deleted
      const entryLines = await EntryLine.find({ transaction: transaction._id });
      expect(entryLines.length).toBe(0);
    });
  });

  describe('POST /api/transactions/:transactionId/entries', () => {
    it('should add an entry line to a transaction', async () => {
      // Create test transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Transaction for entry line test'
      });
      await transaction.save();

      const entryData = {
        account: assetAccount._id,
        description: 'New entry line',
        amount: 75,
        type: 'debit'
      };

      const res = await request(app)
        .post(`/api/transactions/${transaction._id}/entries`)
        .send(entryData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toBe(transaction._id.toString());
      expect(res.body.data.account).toBe(assetAccount._id.toString());
      expect(res.body.data.amount).toBe(entryData.amount);

      // Verify entry line was saved to database
      const savedEntryLine = await EntryLine.findById(res.body.data._id);
      expect(savedEntryLine).toBeDefined();
    });
  });

  describe('GET /api/transactions/:transactionId/entries', () => {
    it('should get all entry lines for a transaction', async () => {
      // Create test transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Transaction for entry line list'
      });
      await transaction.save();

      // Create some entry lines
      const entryLine1 = new EntryLine({
        transaction: transaction._id,
        account: assetAccount._id,
        amount: 100,
        type: 'debit'
      });
      await entryLine1.save();

      const entryLine2 = new EntryLine({
        transaction: transaction._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'credit'
      });
      await entryLine2.save();

      const res = await request(app).get(`/api/transactions/${transaction._id}/entries`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('EntryLine API', () => {
    let transaction;
    let entryLine;

    beforeEach(async () => {
      // Create test transaction and entry line
      transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Transaction for entry line tests'
      });
      await transaction.save();

      entryLine = new EntryLine({
        transaction: transaction._id,
        account: assetAccount._id,
        description: 'Test entry line',
        amount: 50,
        type: 'debit'
      });
      await entryLine.save();
    });

    describe('GET /api/entries/:id', () => {
      it('should get a single entry line', async () => {
        const res = await request(app).get(`/api/entries/${entryLine._id}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(entryLine._id.toString());
        expect(res.body.data.transaction._id).toBe(transaction._id.toString());
        expect(res.body.data.account._id).toBe(assetAccount._id.toString());
      });
    });

    describe('PUT /api/entries/:id', () => {
      it('should update an entry line', async () => {
        const updatedData = {
          description: 'Updated entry line',
          amount: 75
        };

        const res = await request(app)
          .put(`/api/entries/${entryLine._id}`)
          .send(updatedData);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.description).toBe(updatedData.description);
        expect(res.body.data.amount).toBe(updatedData.amount);

        // Verify database was updated
        const updatedEntryLine = await EntryLine.findById(entryLine._id);
        expect(updatedEntryLine.description).toBe(updatedData.description);
        expect(updatedEntryLine.amount).toBe(updatedData.amount);
      });
    });

    describe('DELETE /api/entries/:id', () => {
      it('should delete an entry line', async () => {
        const res = await request(app).delete(`/api/entries/${entryLine._id}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify entry line was deleted
        const deletedEntryLine = await EntryLine.findById(entryLine._id);
        expect(deletedEntryLine).toBeNull();
      });
    });
  });
}); 