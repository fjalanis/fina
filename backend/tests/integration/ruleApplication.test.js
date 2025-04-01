const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

// Setup test database
setupDB();

describe('Rule Application Integration', () => {
  let testAccount1, testAccount2, testAccount3;

  beforeAll(async () => {
    // Create test accounts
    testAccount1 = await Account.create({
      name: 'Test Account 1',
      type: 'asset'
    });
    testAccount2 = await Account.create({
      name: 'Test Account 2',
      type: 'expense'
    });
    testAccount3 = await Account.create({
      name: 'Test Account 3',
      type: 'expense'
    });
  });

  afterAll(async () => {
    await Account.deleteMany({});
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
  });

  beforeEach(async () => {
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
  });

  describe('Transaction Creation with Rule Application', () => {
    it('should apply rules when creating a new transaction', async () => {
      // Create edit rule
      const rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'Test',
        newDescription: 'Tested Transaction',
        sourceAccounts: [testAccount1._id],
        autoApply: true
      });

      // Create transaction that matches rule
      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: new Date(),
          description: 'Test Transaction',
          entries: [
            {
              account: testAccount1._id,
              amount: 50,
              type: 'debit'
            },
            {
              account: testAccount2._id,
              amount: 50,
              type: 'credit'
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.data.entries).toHaveLength(2); // Two entries to make it balanced
      expect(response.body.data.description).toBe('Tested Transaction');
      expect(response.body.data.isBalanced).toBe(true);
    });

    it('should not apply rules when conditions are not met', async () => {
      // Create edit rule
      const rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'Test',
        newDescription: 'Tested Transaction',
        sourceAccounts: [testAccount1._id],
        autoApply: true
      });

      // Create transaction that doesn't match rule
      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: new Date(),
          description: 'Different Transaction',
          entries: [
            {
              account: testAccount1._id,
              amount: 50,
              type: 'debit'
            },
            {
              account: testAccount2._id,
              amount: 50,
              type: 'credit'
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.data.entries).toHaveLength(2); // Two entries to make it balanced
      expect(response.body.data.description).toBe('Different Transaction');
      expect(response.body.data.isBalanced).toBe(true);
    });
  });

  describe('Rule Application to Existing Transactions', () => {
    it('should apply rules when updating a transaction', async () => {
      // Create edit rule
      const rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'Test',
        newDescription: 'Tested Transaction',
        sourceAccounts: [testAccount1._id],
        autoApply: true
      });

      // Create initial transaction
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'Different Transaction',
        entries: [
          {
            account: testAccount1._id,
            amount: 50,
            type: 'debit'
          },
          {
            account: testAccount2._id,
            amount: 50,
            type: 'credit'
          }
        ]
      });

      // Update transaction to match rule
      const response = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .send({
          description: 'Test Transaction',
          entries: [
            {
              account: testAccount1._id,
              amount: 50,
              type: 'debit'
            },
            {
              account: testAccount2._id,
              amount: 50,
              type: 'credit'
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.entries).toHaveLength(2); // Two entries to make it balanced
      expect(response.body.data.description).toBe('Tested Transaction');
      expect(response.body.data.isBalanced).toBe(true);
    });
  });

  describe('Rule Entry Type Filtering', () => {
    it('should apply rule only to transactions with matching entry type', async () => {
      // Create a rule with credit entry type filter
      const rule = await Rule.create({
        name: 'Credit Only Rule',
        type: 'edit',
        pattern: 'Test',
        newDescription: 'Credit Transaction',
        sourceAccounts: [],
        entryType: 'credit',
        autoApply: true
      });
      
      // Create a transaction with debit entry (should not match)
      const debitResponse = await request(app)
        .post('/api/transactions')
        .send({
          date: new Date(),
          description: 'Test Transaction',
          entries: [
            {
              account: testAccount1._id,
              amount: 100,
              type: 'debit'
            }
          ]
        });
      
      // Create a transaction with credit entry (should match)
      const creditResponse = await request(app)
        .post('/api/transactions')
        .send({
          date: new Date(),
          description: 'Test Transaction',
          entries: [
            {
              account: testAccount1._id,
              amount: 100,
              type: 'credit'
            }
          ]
        });
      
      // Check that the credit transaction was updated but the debit transaction wasn't
      expect(debitResponse.status).toBe(201);
      expect(debitResponse.body.data.description).toBe('Test Transaction');
      
      expect(creditResponse.status).toBe(201);
      expect(creditResponse.body.data.description).toBe('Credit Transaction');
    });
  });

  describe('Apply Rules to All Transactions', () => {
    it('should apply rules to all unbalanced transactions', async () => {
      // Create test accounts
      const sourceAccount = await Account.create({
        name: 'Source Account',
        type: 'asset',
        subtype: 'checking'
      });
      
      const targetAccount = await Account.create({
        name: 'Target Account',
        type: 'expense',
        subtype: 'general'
      });
      
      // Create an edit rule
      const rule = await Rule.create({
        name: 'Batch Edit Rule',
        type: 'edit',
        pattern: 'Bulk',
        newDescription: 'Processed Bulk',
        sourceAccounts: [sourceAccount._id],
        entryType: 'both',
        autoApply: true
      });
      
      // Create unbalanced transactions
      // Transaction 1 - Should match
      await Transaction.create({
        date: new Date(),
        description: 'Bulk Transaction 1',
        entries: [
          {
            account: sourceAccount._id,
            amount: 100,
            entryType: 'debit',
            memo: 'Test entry'
          }
          // No offsetting credit entry makes this unbalanced
        ]
      });
      
      // Transaction 2 - Should match
      await Transaction.create({
        date: new Date(),
        description: 'Bulk Transaction 2',
        entries: [
          {
            account: sourceAccount._id,
            amount: 200,
            entryType: 'debit',
            memo: 'Test entry'
          }
          // No offsetting credit entry makes this unbalanced
        ]
      });
      
      // Transaction 3 - Should NOT match (different pattern)
      await Transaction.create({
        date: new Date(),
        description: 'Other Transaction',
        entries: [
          {
            account: sourceAccount._id,
            amount: 300,
            entryType: 'debit',
            memo: 'Test entry'
          }
          // No offsetting credit entry makes this unbalanced
        ]
      });
      
      // Verify transactions are in the database and unbalanced
      const allTransactions = await Transaction.find().populate('entries.account');
      const unbalancedTransactions = allTransactions.filter(tx => !tx.isBalanced);
      console.log(`Found ${unbalancedTransactions.length} unbalanced transactions in the test`);
      expect(unbalancedTransactions.length).toBe(3);
      
      // Apply rules to all transactions
      const response = await request(app)
        .post('/api/rules/apply-all')
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify results
      const updatedTransactions = await Transaction.find().sort({ description: 1 });
      
      // Find the transactions by description
      const bulkTx1 = updatedTransactions.find(tx => tx.description.includes('Bulk') || tx.description.includes('Processed'));
      const bulkTx2 = updatedTransactions.filter(tx => tx.description.includes('Bulk') || tx.description.includes('Processed'))[1];
      const otherTx = updatedTransactions.find(tx => tx.description === 'Other Transaction');
      
      // The matching transactions should be updated
      expect(bulkTx1.description).toBe('Processed Bulk');
      expect(bulkTx2.description).toBe('Processed Bulk');
      
      // The non-matching transaction should be unchanged
      expect(otherTx.description).toBe('Other Transaction');
    });
  });
}); 