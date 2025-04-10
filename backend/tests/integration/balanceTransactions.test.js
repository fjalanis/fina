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
  let incomeAccount;

  beforeAll(async () => {
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
    
    liabilityAccount = await Account.create({
      name: 'Credit Card',
      type: 'liability',
      unit: 'USD'
    });
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Transaction.deleteMany({});
    await Account.deleteMany({});

    // Create test accounts
    assetAccount = await Account.create({ name: 'Bank', type: 'asset', unit: 'USD' });
    liabilityAccount = await Account.create({ name: 'Credit Card', type: 'liability', unit: 'USD' });
    incomeAccount = await Account.create({ name: 'Salary', type: 'income', unit: 'USD' });
    expenseAccount = await Account.create({ name: 'Groceries', type: 'expense', unit: 'USD' });
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
            type: 'debit',
            unit: 'USD'
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
            type: 'credit',
            unit: 'USD'
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
            type: 'debit',
            unit: 'USD'
          },
          {
            accountId: liabilityAccount._id,
            amount: 50,
            type: 'credit',
            unit: 'USD'
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
            type: 'credit',
            unit: 'USD'
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
            type: 'debit',
            unit: 'USD'
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
            type: 'debit', // Same type as transaction1
            unit: 'USD'
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

  it('should return balanced transactions', async () => {
    // Create balanced transactions
    await Transaction.create({
      date: new Date(),
      description: 'Salary deposit',
      entries: [
        { accountId: assetAccount._id, amount: 1000, type: 'debit', unit: 'USD' },
        { accountId: incomeAccount._id, amount: 1000, type: 'credit', unit: 'USD' },
      ],
    });
    await Transaction.create({
      date: new Date(),
      description: 'Grocery shopping',
      entries: [
        { accountId: expenseAccount._id, amount: 100, type: 'debit', unit: 'USD' },
        { accountId: assetAccount._id, amount: 100, type: 'credit', unit: 'USD' },
      ],
    });
    // Create unbalanced transaction (should not be returned)
    await Transaction.create({
      date: new Date(),
      description: 'Unbalanced transaction',
      entries: [{ accountId: assetAccount._id, amount: 50, type: 'debit', unit: 'USD' }],
    });

    const response = await request(app).get('/api/transactions/balance?balanced=true');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    response.body.data.forEach(tx => {
      expect(tx.isBalanced).toBe(true);
    });
  });

  it('should return unbalanced transactions', async () => {
    // Create balanced transaction (should not be returned)
    await Transaction.create({
      date: new Date(),
      description: 'Balanced transaction',
      entries: [
        { accountId: assetAccount._id, amount: 200, type: 'debit', unit: 'USD' },
        { accountId: liabilityAccount._id, amount: 200, type: 'credit', unit: 'USD' },
      ],
    });
    // Create unbalanced transactions
    await Transaction.create({
      date: new Date(),
      description: 'Unbalanced debit',
      entries: [{ accountId: expenseAccount._id, amount: 75, type: 'debit', unit: 'USD' }],
    });
    await Transaction.create({
      date: new Date(),
      description: 'Unbalanced credit',
      entries: [{ accountId: incomeAccount._id, amount: 150, type: 'credit', unit: 'USD' }],
    });

    const response = await request(app).get('/api/transactions/balance?balanced=false');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    response.body.data.forEach(tx => {
      expect(tx.isBalanced).toBe(false);
    });
  });

  // *** NEW TEST SUITE FOR SAME ACCOUNT VALIDATION ***
  describe('POST /api/transactions/balance - Same Account Validation', () => {
    it('should return 400 when merging would result in opposing same-account entries', async () => {
        // --- Create data for this specific test ---
        const checkingAccount = await Account.create({ name: 'Test Checking - Invalid Merge', type: 'asset' });
        const checkingAccountId = checkingAccount._id;
        const invalidDebitTx = await Transaction.create({
          date: new Date(),
          description: 'Invalid Debit for Balance Test',
          entries: [{ accountId: checkingAccountId, amount: 55.55, type: 'debit', unit: 'USD' }]
        });
        const invalidCreditTx = await Transaction.create({
          date: new Date(),
          description: 'Invalid Credit for Balance Test',
          entries: [{ accountId: checkingAccountId, amount: 55.55, type: 'credit', unit: 'USD' }]
        });
        const invalidDebitTxId = invalidDebitTx._id.toString();
        const invalidCreditTxId = invalidCreditTx._id.toString();
        // --- End data creation ---

        const res = await request(app)
            .post('/api/transactions/balance')
            .send({
                sourceTransactionId: invalidDebitTxId,
                targetTransactionId: invalidCreditTxId
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/merging these transactions would create an invalid state/i);
    });
    
    it('should return 200 when merging a valid pair of transactions', async () => {
        // --- Create data for this specific test ---
        const checkingAccount = await Account.create({ name: 'Test Checking - Valid Merge', type: 'asset' });
        const savingsAccount = await Account.create({ name: 'Test Savings - Valid Merge', type: 'asset' });
        const checkingAccountId = checkingAccount._id;
        const savingsAccountId = savingsAccount._id;
        const validDebitTx = await Transaction.create({
          date: new Date(),
          description: 'Valid Debit for Balance Test',
          entries: [{ accountId: checkingAccountId, amount: 77.77, type: 'debit', unit: 'USD' }]
        });
        const validCreditTx = await Transaction.create({
          date: new Date(),
          description: 'Valid Credit for Balance Test',
          entries: [{ accountId: savingsAccountId, amount: 77.77, type: 'credit', unit: 'USD' }]
        });
        const validDebitTxId = validDebitTx._id.toString();
        const validCreditTxId = validCreditTx._id.toString();
        // --- End data creation ---

        const res = await request(app)
             .post('/api/transactions/balance')
             .send({
                 sourceTransactionId: validDebitTxId,
                 targetTransactionId: validCreditTxId
             });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });
  });
  // *** END NEW TEST SUITE ***
}); 