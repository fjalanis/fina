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
  
  describe('GET /api/reports/monthly-summary', () => {
    let incomeAccount, expenseAccount;

    beforeEach(async () => {
      // Create income and expense accounts specifically for this test
      incomeAccount = await Account.create({
        name: 'Test Income Account',
        type: 'income'
      });
      
      expenseAccount = await Account.create({
        name: 'Test Expense Account',
        type: 'expense'
      });
      
      // Create transactions for a specific month (March 2023)
      await Transaction.create({
        date: new Date('2023-03-15'),
        description: 'Income Transaction',
        entries: [
          {
            account: incomeAccount._id,
            amount: 1000,
            type: 'credit' // Credit to income account increases income
          },
          {
            account: testAccount1._id, // Using asset account created in top-level beforeEach
            amount: 1000,
            type: 'debit'
          }
        ]
      });
      
      await Transaction.create({
        date: new Date('2023-03-20'),
        description: 'Expense Transaction',
        entries: [
          {
            account: expenseAccount._id,
            amount: 500,
            type: 'debit' // Debit to expense account increases expenses
          },
          {
            account: testAccount1._id,
            amount: 500,
            type: 'credit'
          }
        ]
      });
    });
    
    it('should return monthly income/expense summary for the specified month', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year: 2023,
          month: 3
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      
      const { data } = res.body;
      
      // Check period info
      expect(data.period).toMatchObject({
        year: 2023,
        month: 3
      });
      
      // Check income accounts
      expect(data.income).toBeDefined();
      expect(data.income.accounts).toHaveLength(1);
      expect(data.income.accounts[0].name).toBe('Test Income Account');
      expect(data.income.accounts[0].amount).toBe(1000);
      expect(data.income.total).toBe(1000);
      
      // Check expense accounts
      expect(data.expense).toBeDefined();
      expect(data.expense.accounts).toHaveLength(1);
      expect(data.expense.accounts[0].name).toBe('Test Expense Account');
      expect(data.expense.accounts[0].amount).toBe(500);
      expect(data.expense.total).toBe(500);
      
      // Check net income
      expect(data.netIncome).toBe(500); // 1000 income - 500 expense
    });
    
    it('should return 400 if month is invalid', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year: 2023,
          month: 13 // Invalid month
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Month must be between 1 and 12');
    });
    
    it('should use default current month and year if not specified', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const res = await request(app)
        .get('/api/reports/monthly-summary');
      
      expect(res.status).toBe(200);
      expect(res.body.data.period.year).toBe(currentYear);
      expect(res.body.data.period.month).toBe(currentMonth);
    });
    
    it('should return empty account arrays and zero totals when no data for period', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year: 2025, // Future year with no data
          month: 4
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.income.accounts).toHaveLength(0);
      expect(res.body.data.income.total).toBe(0);
      expect(res.body.data.expense.accounts).toHaveLength(0);
      expect(res.body.data.expense.total).toBe(0);
      expect(res.body.data.netIncome).toBe(0);
    });
    
    it('should correctly report data for April 2025 when transactions exist', async () => {
      // Create specific transactions for April 2025
      await Transaction.create({
        date: new Date('2025-04-10'),
        description: 'April 2025 Income',
        entries: [
          {
            account: incomeAccount._id,
            amount: 2000,
            type: 'credit'
          },
          {
            account: testAccount1._id,
            amount: 2000,
            type: 'debit'
          }
        ]
      });
      
      await Transaction.create({
        date: new Date('2025-04-15'),
        description: 'April 2025 Expense',
        entries: [
          {
            account: expenseAccount._id,
            amount: 800,
            type: 'debit'
          },
          {
            account: testAccount1._id,
            amount: 800,
            type: 'credit'
          }
        ]
      });
      
      const res = await request(app)
        .get('/api/reports/monthly-summary')
        .query({ 
          year: 2025,
          month: 4
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.income.accounts).toHaveLength(1);
      expect(res.body.data.income.accounts[0].name).toBe('Test Income Account');
      expect(res.body.data.income.accounts[0].amount).toBe(2000);
      expect(res.body.data.income.total).toBe(2000);
      
      expect(res.body.data.expense.accounts).toHaveLength(1);
      expect(res.body.data.expense.accounts[0].name).toBe('Test Expense Account');
      expect(res.body.data.expense.accounts[0].amount).toBe(800);
      expect(res.body.data.expense.total).toBe(800);
      
      expect(res.body.data.netIncome).toBe(1200); // 2000 income - 800 expense
    });
  });
}); 