// Set NODE_ENV to test to disable MongoDB transactions
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const { setupDB } = require('../setup');
const { createTestAccount } = require('../testUtils');

// Setup fresh database
setupDB();

describe('Transaction API', () => {
  let assetAccount;
  let expenseAccount;
  let incomeAccount;

  beforeEach(async () => {
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Bank Account',
      type: 'asset',
      unit: 'USD'
    });
    
    expenseAccount = await Account.create({
      name: 'Groceries',
      type: 'expense',
      unit: 'USD'
    });
    
    incomeAccount = await Account.create({
      name: 'Salary',
      type: 'income',
      unit: 'USD'
    });

    // Clear transactions
    await Transaction.deleteMany({});
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction with entries', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: new Date(),
          description: 'Test Transaction',
          entries: [
            {
              accountId: assetAccount._id,
              amount: 100,
              type: 'debit',
              unit: 'USD'
            },
            {
              accountId: expenseAccount._id,
              amount: 100,
              type: 'credit',
              unit: 'USD'
            }
          ]
        });
      
      // Debug what we're actually getting
      console.log('Test - Response status:', response.status);
      console.log('Test - Response body has entries?', !!response.body.data.entries);
      console.log('Test - Response body entries length:', response.body.data.entries?.length);
      
      expect(response.status).toBe(201);
      // Check directly that entries exist and has a length of 2
      expect(Array.isArray(response.body.data.entries)).toBe(true);
      expect(response.body.data.entries.length).toBe(2);
      expect(response.body.data.isBalanced).toBe(true);
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          // Missing required fields
          entries: [
            {
              accountId: assetAccount._id,
              amount: 100,
              type: 'debit',
              unit: 'USD'
            }
          ]
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create some test transactions
      await Transaction.create({
        date: new Date(),
        description: 'Transaction 1',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'credit',
            unit: 'USD'
          }
        ]
      });
      
      await Transaction.create({
        date: new Date(),
        description: 'Transaction 2',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 200,
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: incomeAccount._id,
            amount: 200,
            type: 'credit',
            unit: 'USD'
          }
        ]
      });
    });
    
    it('should get all transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('entries');
    });
    
    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      
      const res = await request(app)
        .get(`/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
        
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    it('should filter transactions by account', async () => {
      const res = await request(app)
        .get(`/api/transactions?accountId=${assetAccount._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      // We don't know exactly how it's filtered, but we should have data
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/transactions/:id', () => {
    let transaction;
    
    beforeEach(async () => {
      transaction = await Transaction.create({
        date: new Date(),
        description: 'Test Transaction',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'credit',
            unit: 'USD'
          }
        ]
      });
    });
    
    it('should get a single transaction', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', transaction._id.toString());
      expect(response.body.data).toHaveProperty('entries');
    });
    
    it('should return 404 for non-existent transaction', async () => {
      const res = await request(app)
        .get(`/api/transactions/${new mongoose.Types.ObjectId()}`);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Transaction not found');
    });
  });
  
  describe('PUT /api/transactions/:id', () => {
    let transaction;
    
    beforeEach(async () => {
      transaction = await Transaction.create({
        date: new Date(),
        description: 'Test Transaction',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'credit',
            unit: 'USD'
          }
        ]
      });
    });
    
    it('should update a transaction', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .send({ description: 'Updated transaction' })
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Updated transaction');
    });
    
    it('should allow unbalanced entries', async () => {
      const res = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .send({
          description: 'Unbalanced Transaction',
          entries: [
            {
              accountId: assetAccount._id,
              amount: 150,
              type: 'debit',
              unit: 'USD'
            }
          ]
        })
        .expect(200);
        
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Unbalanced Transaction');
      expect(res.body.data.entries.length).toBe(1);
      expect(res.body.data.entries[0].amount).toBe(150);
      expect(res.body.data.isBalanced).toBe(false);
    });
  });
  
  describe('DELETE /api/transactions/:id', () => {
    let transaction;
    
    beforeEach(async () => {
      transaction = await Transaction.create({
        date: new Date(),
        description: 'Test Transaction',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
    });
    
    it('should delete a transaction', async () => {
      const toDelete = await Transaction.findById(transaction._id);
      expect(toDelete).not.toBeNull();

      const response = await request(app)
        .delete(`/api/transactions/${transaction._id}`)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction deleted successfully');
      
      // Verify transaction is actually deleted
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();
    });
  });

  describe('POST /api/transactions/:transactionId/entries', () => {
    it('should add an entry to an existing transaction', async () => {
      // First create a transaction
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'Transaction for testing entries',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Now use the API to add an entry
      const res = await request(app)
        .post(`/api/transactions/${transaction._id}/entries`)
        .send({
          accountId: expenseAccount._id,
          amount: 100,
          type: 'credit',
          description: 'Test entry'
        });
      
      // Basic assertions
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // Check the transaction was updated
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.entries.length).toBe(2);
    });
  });

  describe('GET /api/transactions/:transactionId/entries', () => {
    it('should get all entries for a transaction', async () => {
      // Create test transaction with entries
      const transaction = await Transaction.create({
        date: new Date('2023-01-15'),
        description: 'Transaction for entry list',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: expenseAccount._id,
            amount: 100,
            type: 'credit',
            unit: 'USD'
          }
        ]
      });

      const res = await request(app).get(`/api/transactions/${transaction._id}/entries`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

}); 