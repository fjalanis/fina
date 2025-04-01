const mongoose = require('mongoose');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup fresh database for each test
setupDB();

describe('Report Controller', () => {
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
  });
  
  describe('getAccountBalance', () => {
    it('should calculate correct account balance', async () => {
      // Create transactions
      await Transaction.create([
        {
          date: new Date('2024-01-01'),
          description: 'Transaction 1',
          entries: [
            {
              accountId: testAccount1._id,
              amount: 100,
              type: 'debit'
            }
          ]
        },
        {
          date: new Date('2024-01-02'),
          description: 'Transaction 2',
          entries: [
            {
              accountId: testAccount1._id,
              amount: 50,
              type: 'credit'
            }
          ]
        }
      ]);
      
      // Get balance report
      const req = {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await require('../../src/controllers/reportController').getAccountBalance(req, res);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        balances: expect.arrayContaining([
          expect.objectContaining({
            accountId: testAccount1._id.toString(),
            balance: 50 // 100 - 50
          })
        ])
      }));
    });
    
    it('should handle empty date range', async () => {
      const req = {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await require('../../src/controllers/reportController').getAccountBalance(req, res);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        balances: expect.any(Array)
      }));
    });
  });
  
  describe('getTransactionSummary', () => {
    it('should generate correct transaction summary', async () => {
      // Create transactions
      await Transaction.create([
        {
          date: new Date('2024-01-01'),
          description: 'Transaction 1',
          entries: [
            {
              accountId: testAccount1._id,
              amount: 100,
              type: 'debit'
            },
            {
              accountId: testAccount2._id,
              amount: 100,
              type: 'credit'
            }
          ]
        }
      ]);
      
      // Get summary report
      const req = {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await require('../../src/controllers/reportController').getTransactionSummary(req, res);
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        summary: expect.objectContaining({
          totalTransactions: 1,
          totalAmount: 200, // Total of all entries
          averageAmount: 200,
          byType: {
            debit: 100,
            credit: 100
          }
        })
      }));
    });
  });
}); 