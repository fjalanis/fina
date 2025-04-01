const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup test database
setupDB();

describe('Transaction Routes', () => {
  let assetAccount;
  let expenseAccount;
  let incomeAccount;
  
  beforeEach(async () => {
    // Clear the database
    await Promise.all([
      Transaction.deleteMany({}),
      Account.deleteMany({})
    ]);
    
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Bank Account',
      type: 'asset'
    });
    
    expenseAccount = await Account.create({
      name: 'Groceries',
      type: 'expense'
    });
    
    incomeAccount = await Account.create({
      name: 'Salary',
      type: 'income'
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
          {
            account: incomeAccount._id,
            amount: 150,
            type: 'credit'
          },
          {
            account: assetAccount._id,
            amount: 50,
            type: 'debit'
          }
        ]
      });

      // Create a transaction with matching debit imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          {
            account: expenseAccount._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });

      // Create a transaction with non-matching imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 3',
        entries: [
          {
            account: expenseAccount._id,
            amount: 200,
            type: 'debit'
          }
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
          referenceDate: testDate.toISOString() // Pass the same date as the reference
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
          {
            account: expenseAccount._id,
            amount: 150,
            type: 'debit'
          },
          {
            account: assetAccount._id,
            amount: 50,
            type: 'credit'
          }
        ]
      });

      // Create a transaction with matching credit imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          {
            account: incomeAccount._id,
            amount: 100,
            type: 'credit'
          }
        ]
      });

      // Create a transaction with non-matching imbalance
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 3',
        entries: [
          {
            account: incomeAccount._id,
            amount: 200,
            type: 'credit'
          }
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
          referenceDate: testDate.toISOString() // Pass the same date as the reference
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
          {
            account: expenseAccount._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });

      // Create a matching transaction that should be included
      await Transaction.create({
        date: testDate,
        description: 'Test Transaction 2',
        entries: [
          {
            account: expenseAccount._id,
            amount: 100,
            type: 'debit'
          }
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
          referenceDate: testDate.toISOString() // Pass the same date as the reference
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
            {
              account: expenseAccount._id,
              amount: 100,
              type: 'debit'
            }
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
          referenceDate: testDate.toISOString() // Pass the same date as the reference
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
}); 