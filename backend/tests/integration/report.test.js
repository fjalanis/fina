const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const { setupDB } = require('../setup');

// Setup fresh database for each test
setupDB();

describe('Report API Tests', () => {
  let testAccount1, testAccount2;
  
  beforeEach(async () => {
    // Create test accounts
    testAccount1 = await Account.create({
      name: 'Test Account 1',
      type: 'asset'
    });
    
    testAccount2 = await Account.create({
      name: 'Test Account 2',
      type: 'expense'
    });
    
    // Create some test transactions
    await Transaction.create({
      date: new Date('2023-01-01'),
      description: 'Test Transaction 1',
      entries: [
        {
          account: testAccount1._id,
          amount: 100,
          type: 'debit'
        },
        {
          account: testAccount2._id,
          amount: 100,
          type: 'credit'
        }
      ]
    });
    
    await Transaction.create({
      date: new Date('2023-01-15'),
      description: 'Test Transaction 2',
      entries: [
        {
          account: testAccount1._id,
          amount: 50,
          type: 'credit'
        },
        {
          account: testAccount2._id,
          amount: 50,
          type: 'debit'
        }
      ]
    });
  });
  
  describe('GET /api/reports/account-balance', () => {
    it('should return 400 if start date is missing', async () => {
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          endDate: '2023-12-31'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Start date is required');
    });
    
    it('should return 400 if end date is missing', async () => {
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: '2023-01-01'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('End date is required');
    });
    
    it('should return account balances for the specified date range', async () => {
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2); // Two accounts
      
      // Check account 1 balance
      const account1Balance = res.body.find(b => b.accountId.toString() === testAccount1._id.toString());
      expect(account1Balance).toBeDefined();
      expect(account1Balance.balance).toBe(50); // 100 debit - 50 credit
      
      // Check account 2 balance
      const account2Balance = res.body.find(b => b.accountId.toString() === testAccount2._id.toString());
      expect(account2Balance).toBeDefined();
      expect(account2Balance.balance).toBe(-50); // -100 credit + 50 debit
    });
  });
  
  describe('GET /api/reports/transaction-summary', () => {
    it('should return transaction summary for the specified date range', async () => {
      const res = await request(app)
        .get('/api/reports/transaction-summary')
        .query({ 
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('transactions');
      expect(res.body.transactions).toHaveLength(2); // Two transactions
      
      // Check first transaction
      const transaction1 = res.body.transactions.find(t => t.description === 'Test Transaction 1');
      expect(transaction1).toBeDefined();
      expect(transaction1.totalDebits).toBe(100);
      expect(transaction1.totalCredits).toBe(100);
      expect(transaction1.isBalanced).toBe(true);
      
      // Check second transaction
      const transaction2 = res.body.transactions.find(t => t.description === 'Test Transaction 2');
      expect(transaction2).toBeDefined();
      expect(transaction2.totalDebits).toBe(50);
      expect(transaction2.totalCredits).toBe(50);
      expect(transaction2.isBalanced).toBe(true);
      
      // Check summary
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('totalTransactions', 2);
      expect(res.body.summary).toHaveProperty('totalAmount', 300); // 100 + 100 + 50 + 50
    });
  });
}); 