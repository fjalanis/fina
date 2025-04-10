const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB, connectDB, disconnectDB, clearDB } = require('../setup');

// Setup test database
setupDB(); // Restore this call

describe('Transaction Routes', () => {
  let assetAccountUSD;
  let expenseAccountUSD;
  let incomeAccountUSD;
  let assetAccountAAPL;
  
  beforeEach(async () => {
    // Clear the database
    await Promise.all([
      Transaction.deleteMany({}),
      Account.deleteMany({})
    ]);
    
    // Create test accounts
    assetAccountUSD = await Account.create({
      name: 'Bank Account USD',
      type: 'asset',
      unit: 'USD'
    });
    
    expenseAccountUSD = await Account.create({
      name: 'Groceries USD',
      type: 'expense',
      unit: 'USD'
    });
    
    incomeAccountUSD = await Account.create({
      name: 'Salary USD',
      type: 'income',
      unit: 'USD'
    });

    assetAccountAAPL = await Account.create({
      name: 'AAPL Stock',
      type: 'asset',
      unit: 'stock:AAPL'
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a balanced transaction with correct USD units and isBalanced=true', async () => {
      const transactionData = {
        date: new Date(),
        description: 'Paycheck Deposit',
        entries: [
          { accountId: assetAccountUSD._id, amount: 2000, type: 'debit' },
          { accountId: incomeAccountUSD._id, amount: 2000, type: 'credit' }
        ]
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(201);
        
      expect(res.body.success).toBe(true);
      const createdTx = res.body.data;
      expect(createdTx.description).toBe('Paycheck Deposit');
      expect(createdTx.entries.length).toBe(2);
      expect(createdTx.entries[0].unit).toBe('USD');
      expect(createdTx.entries[1].unit).toBe('USD');
      expect(createdTx.isBalanced).toBe(true);
    });

    it('should create an unbalanced transaction with correct USD units and isBalanced=false', async () => {
      const transactionData = {
        date: new Date(),
        description: 'Grocery Shopping',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 100, type: 'debit' }
        ]
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(201);
        
      expect(res.body.success).toBe(true);
      const createdTx = res.body.data;
      expect(createdTx.description).toBe('Grocery Shopping');
      expect(createdTx.entries.length).toBe(1);
      expect(createdTx.entries[0].unit).toBe('USD');
      expect(createdTx.isBalanced).toBe(false);
    });

    it('should create a multi-unit transaction (implicitly balanced) with correct units and isBalanced=true', async () => {
      const transactionData = {
        date: new Date(),
        description: 'Buy AAPL Stock',
        entries: [
          { accountId: assetAccountAAPL._id, amount: 10, type: 'debit' },
          { accountId: assetAccountUSD._id, amount: 1500, type: 'credit' }
        ]
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(201);
        
      expect(res.body.success).toBe(true);
      const createdTx = res.body.data;
      expect(createdTx.description).toBe('Buy AAPL Stock');
      expect(createdTx.entries.length).toBe(2);
      const aaplEntry = createdTx.entries.find(e => e.accountId === assetAccountAAPL._id.toString());
      const usdEntry = createdTx.entries.find(e => e.accountId === assetAccountUSD._id.toString());
      expect(aaplEntry.unit).toBe('stock:AAPL');
      expect(usdEntry.unit).toBe('USD');
      expect(createdTx.isBalanced).toBe(true);
    });

    it('should fail if an entry references a non-existent account', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const transactionData = {
        date: new Date(),
        description: 'Bad Transaction',
        entries: [
          { accountId: nonExistentId, amount: 100, type: 'debit' }
        ]
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(400);
        
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Account not found');
    });

  });

  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction, re-enrich units, and update balance status', async () => {
      const initialTx = await Transaction.create({
        date: new Date(),
        description: 'Initial Unbalanced',
        entries: [
          { accountId: expenseAccountUSD._id, unit: 'USD', amount: 50, type: 'debit' }
        ]
      });
      let fetchedTx = await Transaction.findById(initialTx._id).populate('entries.account');
      expect(fetchedTx.isBalanced).toBe(false);

      const updateData = {
        description: 'Updated Balanced',
        entries: [
          { _id: initialTx.entries[0]._id, accountId: expenseAccountUSD._id, amount: 50, type: 'debit' },
          { accountId: assetAccountUSD._id, amount: 50, type: 'credit' }
        ]
      };
      
      const res = await request(app)
        .put(`/api/transactions/${initialTx._id}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      const updatedTx = res.body.data;
      expect(updatedTx.description).toBe('Updated Balanced');
      expect(updatedTx.entries.length).toBe(2);
      expect(updatedTx.entries[0].unit).toBe('USD');
      expect(updatedTx.entries[1].unit).toBe('USD');
      expect(updatedTx.isBalanced).toBe(true);
    });

    it('should update a transaction to become multi-unit and implicitly balanced', async () => {
      const initialTx = await Transaction.create({
        date: new Date(),
        description: 'Initial Balanced USD',
        entries: [
          { accountId: assetAccountUSD._id, unit: 'USD', amount: 100, type: 'debit' },
          { accountId: incomeAccountUSD._id, unit: 'USD', amount: 100, type: 'credit' }
        ]
      });
      let fetchedTx = await Transaction.findById(initialTx._id).populate('entries.account');
      expect(fetchedTx.isBalanced).toBe(true);

      const updateData = {
        entries: [
          { _id: initialTx.entries[0]._id, accountId: assetAccountAAPL._id, amount: 1, type: 'debit' },
          { _id: initialTx.entries[1]._id, accountId: incomeAccountUSD._id, amount: 100, type: 'credit' }
        ]
      };
      
      const res = await request(app)
        .put(`/api/transactions/${initialTx._id}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      const updatedTx = res.body.data;
      expect(updatedTx.entries.length).toBe(2);
      const aaplEntry = updatedTx.entries.find(e => e.unit === 'stock:AAPL');
      const usdEntry = updatedTx.entries.find(e => e.unit === 'USD');
      expect(aaplEntry).toBeDefined();
      expect(usdEntry).toBeDefined();
      expect(updatedTx.isBalanced).toBe(true);
    });
  });

  describe('GET /api/transactions/matches', () => {
    it('should find complementary transactions for a debit amount', async () => {
      const targetAmount = 100;
      // Use a simple fixed date
      const testDate = new Date('2023-01-15');
      
      // Create a transaction with credit imbalance (we're looking for debit-heavy transactions)
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 1',
        entries: [
          { accountId: incomeAccountUSD._id, amount: 150, type: 'credit', unit: 'USD' },
          { accountId: assetAccountUSD._id, amount: 50, type: 'debit', unit: 'USD' }
        ]
      });

      // Create a transaction with matching debit imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 100, type: 'debit', unit: 'USD' }
        ]
      });

      // Create a transaction with non-matching imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 3',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 200, type: 'debit', unit: 'USD' }
        ]
      });

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: targetAmount.toString(),
          type: 'debit',
          dateRange: '5',
          page: '1',
          limit: '10',
          referenceDate: testDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                description: 'Test Transaction 2'
              })
            ]),
            pagination: expect.objectContaining({
              total: 1,
              page: 1,
              limit: 10,
              pages: 1
            })
          })
        })
      );
    });

    it('should find complementary transactions for a credit amount', async () => {
      const targetAmount = 100;
      // Use a simple fixed date
      const testDate = new Date('2023-01-15');
      
      // Create a transaction with debit imbalance (we're looking for credit-heavy transactions)
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 1',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 150, type: 'debit', unit: 'USD' },
          { accountId: assetAccountUSD._id, amount: 50, type: 'credit', unit: 'USD' }
        ]
      });

      // Create a transaction with matching credit imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          { accountId: incomeAccountUSD._id, amount: 100, type: 'credit', unit: 'USD' }
        ]
      });

      // Create a transaction with non-matching imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 3',
        entries: [
          { accountId: incomeAccountUSD._id, amount: 200, type: 'credit', unit: 'USD' }
        ]
      });

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: targetAmount.toString(),
          type: 'credit',
          dateRange: '5',
          page: '1',
          limit: '10',
          referenceDate: testDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                description: 'Test Transaction 2'
              })
            ]),
            pagination: expect.objectContaining({
              total: 1,
              page: 1,
              limit: 10,
              pages: 1
            })
          })
        })
      );
    });

    it('should exclude specified transaction from results', async () => {
      const targetAmount = 100;
      // Use a simple fixed date
      const testDate = new Date('2023-01-15');
      
      // Create a transaction to exclude
      const excludeTransaction = await Transaction.create({
        date: testDate,
        description: 'Test Transaction 1',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 100, type: 'debit', unit: 'USD' }
        ]
      });

      // Create a matching transaction that should be included
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 100, type: 'debit', unit: 'USD' }
        ]
      });

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: targetAmount.toString(),
          type: 'debit',
          dateRange: '5',
          page: '1',
          limit: '10',
          excludeTransactionId: excludeTransaction._id.toString(),
          referenceDate: testDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            transactions: expect.arrayContaining([
              expect.objectContaining({
                description: 'Test Transaction 2'
              })
            ]),
            transactions: expect.not.arrayContaining([
              expect.objectContaining({
                description: 'Test Transaction 1'
              })
            ]),
            pagination: expect.objectContaining({
              total: 1,
              page: 1,
              limit: 10,
              pages: 1
            })
          })
        })
      );
    });

    it('should return empty results if no matches found', async () => {
      const targetAmount = 100;
      // Use a simple fixed date
      const testDate = new Date('2023-01-15');
      
      // Create a transaction with debit imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 1',
        entries: [
          { accountId: expenseAccountUSD._id, amount: 150, type: 'debit', unit: 'USD' }
        ]
      });

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: targetAmount.toString(),
          type: 'credit',
          dateRange: '5',
          page: '1',
          limit: '10',
          referenceDate: testDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const targetAmount = 100;
      // Use a simple fixed date
      const testDate = new Date('2023-01-15');
      
      // Create 15 matching transactions
      for (let i = 0; i < 15; i++) {
        await Transaction.create({
          date: testDate,
          description: `Test Transaction ${i + 1}`,
          entries: [
            { accountId: expenseAccountUSD._id, amount: targetAmount, type: 'debit', unit: 'USD' }
          ]
        });
      }

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: targetAmount.toString(),
          type: 'debit',
          dateRange: '5',
          page: '1',
          limit: '10',
          referenceDate: testDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            transactions: expect.any(Array),
            pagination: expect.objectContaining({
              total: 15,
              page: 1,
              limit: 10,
              pages: 2
            })
          })
        })
      );
    });

    it('should return error for invalid amount', async () => {
      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: 'invalid',
          type: 'debit',
          dateRange: '5',
          page: '1',
          limit: '10'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Amount must be a valid number'
        })
      );
    });

    it('should return error when amount and type are not provided', async () => {
      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          dateRange: '5',
          page: '1',
          limit: '10'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Amount and type must be provided'
        })
      );
    });
  });

  describe('GET /api/transactions/suggestions', () => {
    // ... existing suggestions tests ...
  });

  describe('GET /api/transactions/:id', () => {
    it('should get a single transaction and populate account units', async () => {
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'Buy AAPL Stock Test Get',
        entries: [
          { accountId: assetAccountAAPL._id, unit: 'stock:AAPL', amount: 5, type: 'debit' },
          { accountId: assetAccountUSD._id, unit: 'USD', amount: 750, type: 'credit' }
        ]
      });

      const res = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      const fetchedTx = res.body.data;
      expect(fetchedTx._id).toBe(transaction._id.toString());
      expect(fetchedTx.entries.length).toBe(2);
      const aaplEntry = fetchedTx.entries.find(e => e.accountId === assetAccountAAPL._id.toString());
      const usdEntry = fetchedTx.entries.find(e => e.accountId === assetAccountUSD._id.toString());
      expect(aaplEntry.account).toBeDefined();
      expect(aaplEntry.account.unit).toBe('stock:AAPL'); 
      expect(usdEntry.account).toBeDefined();
      expect(usdEntry.account.unit).toBe('USD');
      expect(aaplEntry.unit).toBe('stock:AAPL');
      expect(usdEntry.unit).toBe('USD');
      expect(fetchedTx.isBalanced).toBe(true);
    });

    // Add test case for filtering by accountId
    it('should filter transactions by accountId', async () => {
        // Create two transactions, one involving account1, one involving account2
        const account1 = await Account.create({ name: 'Test Account 1', type: 'asset' });
        const account2 = await Account.create({ name: 'Test Account 2', type: 'asset' });
        const account3 = await Account.create({ name: 'Cash', type: 'asset' }); // Common account

        const transaction1 = await Transaction.create({
            date: new Date(),
            description: 'Transaction for Account 1',
            entries: [
                { accountId: account1._id, amount: 100, type: 'debit', unit: account1.unit || 'USD' },
                { accountId: account3._id, amount: 100, type: 'credit', unit: account3.unit || 'USD' },
            ],
        });

        const transaction2 = await Transaction.create({
            date: new Date(),
            description: 'Transaction for Account 2',
            entries: [
                { accountId: account2._id, amount: 50, type: 'debit', unit: account2.unit || 'USD' },
                { accountId: account3._id, amount: 50, type: 'credit', unit: account3.unit || 'USD' },
            ],
        });

        // Fetch transactions filtering by account1._id
        const res = await request(app).get(`/api/transactions?accountId=${account1._id}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBe(1); // Should only find transaction1
        expect(res.body.data[0]._id).toBe(transaction1._id.toString());
        expect(res.body.data[0].description).toBe('Transaction for Account 1');

        // Verify entries are populated correctly (optional but good)
        expect(res.body.data[0].entries[0].account.name).toBe('Test Account 1');
    });

    // Test case for invalid transaction ID
    it('should return 404 for non-existent transaction ID', async () => {
      const res = await request(app)
        .get('/api/transactions/nonexistentid')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Transaction not found');
    });
  });

  // *** NEW TEST FOR SAME ACCOUNT VALIDATION ***
  describe('POST /api/transactions - Same Account Validation', () => {
    it('should return 400 when creating a transaction with opposing same-account entries', async () => {
      // Create account specifically for this test
      const checkingAccount = await Account.create({ name: 'Test Checking For Routes - Invalid', type: 'asset'});
      const checkingAccountId = checkingAccount._id.toString();

      const invalidTransactionData = {
        date: new Date().toISOString().split('T')[0],
        description: 'API Invalid Same Account Test',
        entries: [
          { account: checkingAccountId, amount: 50, type: 'debit' }, 
          { account: checkingAccountId, amount: 50, type: 'credit' }
        ]
      };

      const res = await request(app)
        .post('/api/transactions')
        .send(invalidTransactionData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/cannot debit and credit the same account/i);
    });

    it('should return 201 when creating a valid transaction', async () => {
      // Create accounts specifically for this test
      const checkingAccount = await Account.create({ name: 'Test Checking For Routes - Valid', type: 'asset'});
      const savingsAccount = await Account.create({ name: 'Test Savings For Routes - Valid', type: 'asset'});
      const checkingAccountId = checkingAccount._id.toString();
      const savingsAccountId = savingsAccount._id.toString();

      const validTransactionData = {
        date: new Date().toISOString().split('T')[0],
        description: 'API Valid Transaction Test',
        entries: [
          { account: checkingAccountId, amount: 75, type: 'debit' },
          { account: savingsAccountId, amount: 75, type: 'credit' }
        ]
      };

      const res = await request(app)
        .post('/api/transactions')
        .send(validTransactionData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      // Clean up created transaction if necessary
      await Transaction.findByIdAndDelete(res.body.data._id);
    });
  });
   // *** END NEW TEST ***
});

describe('DELETE /api/transactions/:transactionId/entries/:entryId', () => {
  let testTransaction;
  let testAccount1;
  let testAccount2;

  beforeEach(async () => {
    // Create accounts needed for these specific tests using VALID types
    testAccount1 = new Account({ name: 'Test Delete Acc 1', type: 'asset' }); // Use valid type 'asset'
    testAccount2 = new Account({ name: 'Test Delete Acc 2', type: 'expense' }); // Keep valid type 'expense'
    await testAccount1.save();
    await testAccount2.save();

    // Create a transaction with multiple entries for deletion tests
    testTransaction = new Transaction({
      date: new Date(),
      description: 'Test Delete Entry Transaction',
      entries: [
        { accountId: testAccount1._id, amount: 100, type: 'debit', unit: 'USD' },
        { accountId: testAccount2._id, amount: 50, type: 'credit', unit: 'USD' },
        { accountId: testAccount2._id, amount: 50, type: 'credit', unit: 'USD' },
      ]
    });
    await testTransaction.save();
  });

  it('should delete an entry successfully and return the updated transaction', async () => {
    const entryToDelete = testTransaction.entries[1]; // Target the first credit entry
    const initialEntryCount = testTransaction.entries.length;

    const res = await request(app)
      .delete(`/api/transactions/${testTransaction._id}/entries/${entryToDelete._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toEqual(testTransaction._id.toString());
    expect(res.body.data.entries).toHaveLength(initialEntryCount - 1);
    // Check that the specific entry ID is no longer present
    expect(res.body.data.entries.find(e => e._id === entryToDelete._id.toString())).toBeUndefined();

    // Verify in DB
    const updatedTxn = await Transaction.findById(testTransaction._id);
    expect(updatedTxn.entries).toHaveLength(initialEntryCount - 1);
  });

  it('should delete the last entry and the transaction itself', async () => {
    // Create a transaction with only one entry
    const singleEntryTxn = new Transaction({
      date: new Date(),
      description: 'Single Entry Test',
      entries: [
        { accountId: testAccount1._id, amount: 25, type: 'debit', unit: 'USD' }
      ]
    });
    await singleEntryTxn.save();
    const entryToDelete = singleEntryTxn.entries[0];

    const res = await request(app)
      .delete(`/api/transactions/${singleEntryTxn._id}/entries/${entryToDelete._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({}); // Empty data indicates transaction deleted
    expect(res.body.message).toContain('transaction removed as it became empty');

    // Verify transaction is deleted from DB
    const deletedTxn = await Transaction.findById(singleEntryTxn._id);
    expect(deletedTxn).toBeNull();
  });

  it('should return 404 if the transaction does not exist', async () => {
    const nonExistentTxnId = new mongoose.Types.ObjectId();
    const nonExistentEntryId = new mongoose.Types.ObjectId(); 

    const res = await request(app)
      .delete(`/api/transactions/${nonExistentTxnId}/entries/${nonExistentEntryId}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toEqual('Transaction not found');
  });

  it('should return 200 (success) if the entry does not exist but the transaction does', async () => {
    const nonExistentEntryId = new mongoose.Types.ObjectId();
    const initialEntryCount = testTransaction.entries.length;

    const res = await request(app)
      .delete(`/api/transactions/${testTransaction._id}/entries/${nonExistentEntryId}`);

    // The $pull operation doesn't error if the item isn't found.
    // The controller now handles this by returning the current transaction state.
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toEqual(testTransaction._id.toString());
    expect(res.body.data.entries).toHaveLength(initialEntryCount); // No change in entries
  });
}); 