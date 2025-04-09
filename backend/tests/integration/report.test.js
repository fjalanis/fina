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
      type: 'asset',
      unit: 'USD'
    });
    
    testAccount2 = await Account.create({
      name: 'Test Account 2',
      type: 'expense',
      unit: 'USD'
    });
    
    // Create some test transactions
    await Transaction.create({
      date: new Date('2023-01-01'),
      description: 'Test Transaction 1',
      entries: [
        {
          accountId: testAccount1._id,
          amount: 100,
          type: 'debit',
          unit: 'USD'
        },
        {
          accountId: testAccount2._id,
          amount: 100,
          type: 'credit',
          unit: 'USD'
        }
      ]
    });
    
    await Transaction.create({
      date: new Date('2023-01-15'),
      description: 'Test Transaction 2',
      entries: [
        {
          accountId: testAccount1._id,
          amount: 50,
          type: 'credit',
          unit: 'USD'
        },
        {
          accountId: testAccount2._id,
          amount: 50,
          type: 'debit',
          unit: 'USD'
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
  
  describe('GET /api/reports/income-expense-summary', () => {
    let incomeAccount, expenseAccount;

    beforeEach(async () => {
      // Clear transactions specifically
      await Transaction.deleteMany({});
      
      // Use existing accounts or create new ones if needed
      incomeAccount = await Account.create({
        name: 'Income Source',
        type: 'income',
        unit: 'USD'
      });
      
      expenseAccount = await Account.create({
        name: 'Expense Category',
        type: 'expense',
        unit: 'USD'
      });
      
      // Create transactions within and outside a date range
      await Transaction.create({
        date: new Date('2023-03-15'), // Inside range
        description: 'Income 1',
        entries: [
          { accountId: incomeAccount._id, amount: 1000, type: 'credit', unit: 'USD' },
          { accountId: testAccount1._id, amount: 1000, type: 'debit', unit: 'USD' }
        ]
      });
      await Transaction.create({
        date: new Date('2023-04-05'), // Inside range
        description: 'Expense 1',
        entries: [
          { accountId: expenseAccount._id, amount: 500, type: 'debit', unit: 'USD' },
          { accountId: testAccount1._id, amount: 500, type: 'credit', unit: 'USD' }
        ]
      });
       await Transaction.create({
        date: new Date('2023-04-20'), // Inside range
        description: 'Income 2',
        entries: [
          { accountId: incomeAccount._id, amount: 200, type: 'credit', unit: 'USD' },
          { accountId: testAccount1._id, amount: 200, type: 'debit', unit: 'USD' }
        ]
      });
      await Transaction.create({
        date: new Date('2023-05-10'), // Outside range
        description: 'Expense 2',
        entries: [
          { accountId: expenseAccount._id, amount: 100, type: 'debit', unit: 'USD' },
          { accountId: testAccount1._id, amount: 100, type: 'credit', unit: 'USD' }
        ]
      });
    });
    
    it('should return income/expense summary for the specified date range', async () => {
      const startDate = '2023-03-01';
      const endDate = '2023-04-30';

      const res = await request(app)
        .get('/api/reports/income-expense-summary')
        .query({ 
          startDate: startDate,
          endDate: endDate
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      
      const { data } = res.body;
      
      // Check period info reflects requested range
      expect(data.period).toEqual({ startDate, endDate });
      
      // Check income accounts and total (Income 1 + Income 2)
      expect(data.income).toBeDefined();
      expect(data.income.accounts).toHaveLength(1); // Only one income account used
      expect(data.income.accounts[0].name).toBe('Income Source');
      // Check the total amount summed for this account in the range
      expect(data.income.accounts[0].amount).toBeCloseTo(1000 + 200); 
      expect(data.income.total).toBeCloseTo(1200);
      
      // Check expense accounts and total (Expense 1 only)
      expect(data.expense).toBeDefined();
      expect(data.expense.accounts).toHaveLength(1); // Only one expense account used
      expect(data.expense.accounts[0].name).toBe('Expense Category');
      expect(data.expense.accounts[0].amount).toBeCloseTo(500);
      expect(data.expense.total).toBeCloseTo(500);
      
      // Check net income
      expect(data.netIncome).toBeCloseTo(1200 - 500); // 700
    });
    
    it('should return 400 if startDate is missing', async () => {
      const res = await request(app)
        .get('/api/reports/income-expense-summary')
        .query({ 
          endDate: '2023-04-30'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('Start date and end date parameters are required');
    });

    it('should return 400 if endDate is missing', async () => {
      const res = await request(app)
        .get('/api/reports/income-expense-summary')
        .query({ 
          startDate: '2023-03-01'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('Start date and end date parameters are required');
    });

     it('should return 400 if startDate is after endDate', async () => {
       const res = await request(app)
        .get('/api/reports/income-expense-summary')
        .query({ 
          startDate: '2023-05-01',
          endDate: '2023-04-30'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('Start date cannot be after end date');
    });

     it('should return empty summary if no transactions match date range', async () => {
       const res = await request(app)
        .get('/api/reports/income-expense-summary')
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;
      expect(data.income.accounts).toEqual([]);
      expect(data.income.total).toBe(0);
      expect(data.expense.accounts).toEqual([]);
      expect(data.expense.total).toBe(0);
      expect(data.netIncome).toBe(0);
    });

  });

  // Remove or comment out tests for /api/reports/annual-summary if they exist
  /* describe('GET /api/reports/annual-summary', () => { ... }); */

  // Add tests for other report endpoints if needed...
  describe('GET /api/reports/sankey', () => {
// ... existing tests for sankey ...
  });
}); 