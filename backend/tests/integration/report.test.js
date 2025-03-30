const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/server');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const { setupTestData, clearTestData } = require('../testUtils');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Report API Tests', () => {
  let testData;
  
  beforeEach(async () => {
    // Clear previous test data
    await clearTestData();
    
    // Create test data for reports
    testData = await setupTestData();
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  describe('GET /api/reports/account-balance', () => {
    it('should return 400 if start date is missing', async () => {
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          endDate: '2023-12-31'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Start date and end date are required');
    });
    
    it('should return 400 if end date is missing', async () => {
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: '2023-01-01'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Start date and end date are required');
    });
    
    it('should return account balances for all accounts in given date range', async () => {
      const startDate = new Date(testData.transactions[0].date);
      startDate.setDate(startDate.getDate() - 1);
      
      const endDate = new Date(testData.transactions[0].date);
      endDate.setDate(endDate.getDate() + 1);
      
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Should have data for accounts involved in transactions
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Verify structure of account data
      const accountData = res.body.data[0];
      expect(accountData).toHaveProperty('_id');
      expect(accountData).toHaveProperty('accountName');
      expect(accountData).toHaveProperty('accountType');
      expect(accountData).toHaveProperty('totalDebits');
      expect(accountData).toHaveProperty('totalCredits');
      expect(accountData).toHaveProperty('balance');
    });
    
    it('should filter results by account ID if provided', async () => {
      // First get all account balances to identify one account to filter by
      const startDate = new Date(testData.transactions[0].date);
      startDate.setDate(startDate.getDate() - 1);
      
      const endDate = new Date(testData.transactions[0].date);
      endDate.setDate(endDate.getDate() + 1);
      
      // Get all account balances first
      const allRes = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      
      // Select first account from results to filter
      const targetAccountId = allRes.body.data[0]._id;
      
      // Now test filtering by this account
      const res = await request(app)
        .get('/api/reports/account-balance')
        .query({ 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          accountId: targetAccountId
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Should only return data for the specified account
      if (res.body.data.length > 0) {
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]._id).toBe(targetAccountId);
      }
    });
  });
  
  describe('GET /api/reports/monthly-summary', () => {
    it('should return monthly income/expense summary for specified month', async () => {
      const transactionDate = new Date(testData.transactions[0].date);
      const year = transactionDate.getFullYear();
      const month = transactionDate.getMonth() + 1;
      
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year,
          month
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      
      // Verify structure of the response
      expect(res.body.data).toHaveProperty('income');
      expect(res.body.data).toHaveProperty('expense');
      expect(res.body.data).toHaveProperty('netIncome');
      expect(res.body.data).toHaveProperty('period');
      
      expect(res.body.data.income).toHaveProperty('accounts');
      expect(res.body.data.income).toHaveProperty('total');
      expect(res.body.data.expense).toHaveProperty('accounts');
      expect(res.body.data.expense).toHaveProperty('total');
      
      expect(res.body.data.period.year).toBe(year);
      expect(res.body.data.period.month).toBe(month);
    });
    
    it('should use current month and year if not specified', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const res = await request(app)
        .get('/api/reports/monthly-summary');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      expect(res.body.data.period.year).toBe(currentYear);
      expect(res.body.data.period.month).toBe(currentMonth);
    });
    
    it('should return 400 if invalid month is provided', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year: 2023,
          month: 13 // Invalid month
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Month must be between 1 and 12');
    });
    
    it('should calculate net income correctly', async () => {
      // First clear all existing data to ensure clean test
      await clearTestData();
      
      // Create specific test data with known values
      const incomeAccount = await Account.create({
        name: 'Test Income Account',
        type: 'income',
        description: 'For testing income'
      });
      
      const expenseAccount = await Account.create({
        name: 'Test Expense Account',
        type: 'expense',
        description: 'For testing expenses'
      });
      
      const assetAccount = await Account.create({
        name: 'Test Asset Account',
        type: 'asset',
        description: 'For balancing transactions'
      });
      
      // Create a transaction with income (credit to income account, debit to asset)
      const incomeTransaction = await Transaction.create({
        date: new Date(),
        description: 'Test Income Transaction',
        isBalanced: true
      });
      
      await EntryLine.create({
        transaction: incomeTransaction._id,
        account: incomeAccount._id,
        amount: 1000,
        type: 'credit'
      });
      
      await EntryLine.create({
        transaction: incomeTransaction._id,
        account: assetAccount._id,
        amount: 1000,
        type: 'debit'
      });
      
      // Create a transaction with expense (debit to expense account, credit to asset)
      const expenseTransaction = await Transaction.create({
        date: new Date(),
        description: 'Test Expense Transaction',
        isBalanced: true
      });
      
      await EntryLine.create({
        transaction: expenseTransaction._id,
        account: expenseAccount._id,
        amount: 600,
        type: 'debit'
      });
      
      await EntryLine.create({
        transaction: expenseTransaction._id,
        account: assetAccount._id,
        amount: 600,
        type: 'credit'
      });
      
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ year, month });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Income should be 1000
      expect(res.body.data.income.total).toBe(1000);
      
      // Expense should be 600
      expect(res.body.data.expense.total).toBe(600);
      
      // Net income should be Income - Expense = 1000 - 600 = 400
      expect(res.body.data.netIncome).toBe(400);
    });
  });
}); 