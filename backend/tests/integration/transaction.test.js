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
    assetAccount = await Account.create({
      name: 'Test Bank Account',
      type: 'asset',
      description: 'Test asset account'
    });

    expenseAccount = await Account.create({
      name: 'Test Groceries',
      type: 'expense',
      description: 'Test expense account'
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a transaction with entry lines', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          date: '2023-01-01',
          description: 'Grocery shopping',
          reference: 'SHOP123',
          entryLines: [
            {
              account: expenseAccount._id.toString(),
              amount: 100,
              type: 'debit'
            },
            {
              account: assetAccount._id.toString(),
              amount: 100,
              type: 'credit'
            }
          ]
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.description).toBe('Grocery shopping');
      expect(res.body.data.isBalanced).toBe(true);
    });

    it('should create an unbalanced transaction with a single entry line', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          date: '2023-01-01',
          description: 'Unbalanced Transaction',
          reference: 'UNBAL001',
          entryLines: [
            {
              account: expenseAccount._id.toString(),
              amount: 100,
              type: 'debit'
            }
          ]
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.description).toBe('Unbalanced Transaction');
      expect(res.body.data.isBalanced).toBe(false);
    });

    it('should create a transaction with no entry lines', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          date: '2023-01-01',
          description: 'Empty Transaction',
          reference: 'EMPTY001'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.description).toBe('Empty Transaction');
      expect(res.body.data.isBalanced).toBe(false);
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
    it('should add an entry line to an existing transaction', async () => {
      // Create a transaction first
      const transactionRes = await request(app)
        .post('/api/transactions')
        .send({
          date: '2023-01-01',
          description: 'Transaction to modify',
          reference: 'MOD001'
        });

      const transactionId = transactionRes.body.data._id;

      // Add an entry line
      const entryRes = await request(app)
        .post(`/api/transactions/${transactionId}/entries`)
        .send({
          account: expenseAccount._id.toString(),
          amount: 100,
          type: 'debit'
        });

      expect(entryRes.statusCode).toEqual(201);
      expect(entryRes.body.success).toBe(true);
      expect(entryRes.body.data).toHaveProperty('_id');
      expect(entryRes.body.data.transaction).toBe(transactionId);

      // Verify transaction is still unbalanced
      const updatedTransactionRes = await request(app)
        .get(`/api/transactions/${transactionId}`);

      expect(updatedTransactionRes.body.data.isBalanced).toBe(false);

      // Add a balancing entry line
      const balancingEntryRes = await request(app)
        .post(`/api/transactions/${transactionId}/entries`)
        .send({
          account: assetAccount._id.toString(),
          amount: 100,
          type: 'credit'
        });

      expect(balancingEntryRes.statusCode).toEqual(201);

      // Verify transaction is now balanced
      const finalTransactionRes = await request(app)
        .get(`/api/transactions/${transactionId}`);

      expect(finalTransactionRes.body.data.isBalanced).toBe(true);
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

  // Add tests for transaction balancing
  describe('GET /api/transactions/matches/:id', () => {
    it('should return matching entries for an unbalanced entry line', async () => {
      // Create two unbalanced transactions with matching amounts but opposite types
      const transaction1 = new Transaction({
        date: new Date('2023-01-15'),
        description: 'First unbalanced transaction',
        isBalanced: false
      });
      await transaction1.save();

      const transaction2 = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Second unbalanced transaction',
        isBalanced: false
      });
      await transaction2.save();

      // Create a debit entry for transaction 1
      const entryLine1 = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 150,
        type: 'debit'
      });
      await entryLine1.save();

      // Create a credit entry for transaction 2 with same amount
      const entryLine2 = new EntryLine({
        transaction: transaction2._id,
        account: assetAccount._id,
        amount: 150,
        type: 'credit'
      });
      await entryLine2.save();

      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get matches for the first entry
      const res = await request(app).get(`/api/transactions/matches/${entryLine1._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('targetEntry');
      expect(res.body.data).toHaveProperty('matches');
      expect(res.body.data.matches.length).toBe(1);
      expect(res.body.data.matches[0]._id).toBe(entryLine2._id.toString());
      expect(res.body.data.matches[0].type).toBe('credit');
      expect(res.body.data.matches[0].amount).toBe(150);
    });

    it('should return 404 for non-existent entry line', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/transactions/matches/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Entry line not found');
    });

    it('should return 400 if transaction is already balanced', async () => {
      // Create a balanced transaction
      const transaction = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Balanced transaction',
        isBalanced: true
      });
      await transaction.save();

      // Create an entry line
      const entryLine = new EntryLine({
        transaction: transaction._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await entryLine.save();

      // Force refresh transaction document to ensure isBalanced is true
      await Transaction.findByIdAndUpdate(transaction._id, { isBalanced: true }, { new: true });

      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const res = await request(app).get(`/api/transactions/matches/${entryLine._id}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Transaction is already balanced or does not exist');
    });
  });

  describe('POST /api/transactions/balance', () => {
    it('should balance two transactions by combining their entry lines', async () => {
      // Create two unbalanced transactions
      const transaction1 = new Transaction({
        date: new Date('2023-01-15'),
        description: 'First transaction to balance',
        isBalanced: false
      });
      await transaction1.save();

      const transaction2 = new Transaction({
        date: new Date('2023-01-16'),
        description: 'Second transaction to balance',
        isBalanced: false
      });
      await transaction2.save();

      // Create a debit entry for transaction 1
      const entryLine1 = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 200,
        type: 'debit'
      });
      await entryLine1.save();

      // Create a credit entry for transaction 2
      const entryLine2 = new EntryLine({
        transaction: transaction2._id,
        account: assetAccount._id,
        amount: 200,
        type: 'credit'
      });
      await entryLine2.save();

      // Balance the transactions
      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: entryLine1._id,
          targetEntryId: entryLine2._id
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('transaction');
      expect(res.body.data.transaction.isBalanced).toBe(true);
      expect(res.body.message).toBe('Transactions successfully balanced');

      // Verify that target transaction was deleted
      const targetTransaction = await Transaction.findById(transaction2._id);
      expect(targetTransaction).toBeNull();

      // Verify that source transaction now contains all entry lines
      const sourceTransaction = await Transaction.findById(transaction1._id);
      expect(sourceTransaction).not.toBeNull();
      expect(sourceTransaction.isBalanced).toBe(true);

      // Verify that both entry lines now point to the source transaction
      const entryLines = await EntryLine.find({ 
        _id: { $in: [entryLine1._id, entryLine2._id] }
      });
      expect(entryLines.length).toBe(2);
      expect(entryLines[0].transaction.toString()).toBe(transaction1._id.toString());
      expect(entryLines[1].transaction.toString()).toBe(transaction1._id.toString());
    });

    it('should return 404 if entry lines do not exist', async () => {
      const nonExistentId1 = new mongoose.Types.ObjectId();
      const nonExistentId2 = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: nonExistentId1,
          targetEntryId: nonExistentId2
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('One or both entries not found');
    });

    it('should return 400 if entries have the same type', async () => {
      // Create transaction
      const transaction1 = new Transaction({
        date: new Date('2023-01-15'),
        description: 'Same type transaction',
        isBalanced: false
      });
      await transaction1.save();

      const transaction2 = new Transaction({
        date: new Date('2023-01-16'),
        description: 'Same type transaction 2',
        isBalanced: false
      });
      await transaction2.save();

      // Create two entry lines with the same type
      const entryLine1 = new EntryLine({
        transaction: transaction1._id,
        account: expenseAccount._id,
        amount: 100,
        type: 'debit'
      });
      await entryLine1.save();

      const entryLine2 = new EntryLine({
        transaction: transaction2._id,
        account: assetAccount._id,
        amount: 100,
        type: 'debit' // Same type as entryLine1
      });
      await entryLine2.save();

      const res = await request(app)
        .post('/api/transactions/balance')
        .send({
          sourceEntryId: entryLine1._id,
          targetEntryId: entryLine2._id
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Entries must have opposite types to balance');
    });
  });
}); 