const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

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

    it('should fail if entries array is empty', async () => {
      const transactionData = {
        date: new Date(),
        description: 'Empty Transaction',
        entries: []
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(400);
        
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Transaction must have at least one entry');
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
  });
}); 