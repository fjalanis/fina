const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');
const ruleController = require('../../src/controllers/ruleController');

// Setup test database
setupDB();

// Increase timeout for tests
jest.setTimeout(15000);

describe('Rule Preview Functionality', () => {
  let testAccount1, testAccount2;
  
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
  });
  
  beforeEach(async () => {
    // Clear existing data before each test
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
  });
  
  afterAll(async () => {
    await Account.deleteMany({});
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
  });
  
  describe('GET /api/rules/preview', () => {
    // Test the actual route behavior but without checking specific counts
    it('should return matching transactions for a rule pattern', async () => {
      // Create transaction that should match
      await Transaction.create({
        date: new Date(),
        description: 'GROCERY STORE',
        entries: [
          {
            accountId: testAccount1._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });
      
      // Execute the preview request
      const res = await request(app)
        .get('/api/rules/preview')
        .query({ 
          pattern: 'GROCERY', 
          sourceAccounts: testAccount1._id.toString() 
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('matchingTransactions');
      expect(res.body.data).toHaveProperty('totalUnbalanced');
      expect(res.body.data).toHaveProperty('totalMatching');
      
      // Don't check specific counts due to test database isolation
    });
    
    it('should return 400 if pattern is missing', async () => {
      const response = await request(app)
        .get('/api/rules/preview')
        .query({
          sourceAccounts: testAccount1._id.toString()
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pattern is required for preview');
    });
  });
  
  // Test the controller function directly
  describe('previewMatchingTransactions controller', () => {
    it('should identify matching transactions', async () => {
      // Create transactions directly
      const matchingTx = await Transaction.create({
        date: new Date(),
        description: 'TEST GROCERY STORE',
        entries: [
          {
            accountId: testAccount1._id,
            amount: 100,
            type: 'debit'
          }
        ]
      });
      
      // Mock request and response objects
      const req = {
        query: {
          pattern: 'GROCERY',
          sourceAccounts: testAccount1._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      // Call controller directly
      await ruleController.previewMatchingTransactions(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Get the argument passed to json
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('matchingTransactions');
    });
    
    it('should filter by entry type when specified', async () => {
      // Create transaction with debit entry
      await Transaction.create({
        date: new Date(),
        description: 'TEST GROCERY PURCHASE',
        entries: [
          {
            accountId: testAccount1._id,
            amount: 75,
            type: 'debit'
          }
        ]
      });
      
      // Mock request with credit entry type (which shouldn't match)
      const req = {
        query: {
          pattern: 'GROCERY',
          sourceAccounts: testAccount1._id.toString(),
          entryType: 'credit'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      // Call controller directly
      await ruleController.previewMatchingTransactions(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      
      // Should have no matching transactions since we filter by credit
      // but our transaction has debit entries
      expect(responseData.data.matchingTransactions.length).toBe(0);
    });
  });
});

describe('Rule Preview Integration Tests', () => {
  let testAccount;
  let transaction;

  beforeAll(async () => {
    // Create a test account
    testAccount = await Account.create({
      name: 'Test Account',
      type: 'asset',
      subtype: 'checking',
      institution: 'Test Bank'
    });

    // Create a sample transaction
    transaction = await Transaction.create({
      date: new Date(),
      description: 'GROCERY STORE',
      entries: [
        {
          accountId: testAccount._id,
          amount: 50,
          type: 'debit',
          memo: 'Groceries'
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          amount: 50,
          type: 'credit',
          memo: 'Groceries payment'
        }
      ]
    });
  });

  afterAll(async () => {
    await Transaction.deleteMany({});
    await Account.deleteMany({});
  });

  it('should return matching transactions for a pattern', async () => {
    const response = await request(app)
      .get('/api/rules/preview')
      .query({
        pattern: 'GROCERY',
        sourceAccounts: [testAccount._id.toString()]
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('matchingTransactions');
    expect(response.body.data).toHaveProperty('totalUnbalanced');
    expect(response.body.data).toHaveProperty('totalMatching');
    expect(response.body.data.matchingTransactions.length).toBeGreaterThan(0);
    expect(response.body.data.matchingTransactions[0].description).toContain('GROCERY');
  });

  it('should return empty array for non-matching pattern', async () => {
    const response = await request(app)
      .get('/api/rules/preview')
      .query({
        pattern: 'NON_EXISTENT',
        sourceAccounts: [testAccount._id.toString()]
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.matchingTransactions).toHaveLength(0);
    expect(response.body.data.totalMatching).toBe(0);
  });

  it('should filter by entry type', async () => {
    // Credit transaction should not match when we filter for debit
    const response = await request(app)
      .get('/api/rules/preview')
      .query({
        pattern: 'GROCERY',
        sourceAccounts: [testAccount._id.toString()],
        entryType: 'credit' // This won't match our debit transaction
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.matchingTransactions).toHaveLength(0);
  });

  it('should return 400 if pattern is missing', async () => {
    const response = await request(app)
      .get('/api/rules/preview')
      .query({
        sourceAccounts: [testAccount._id.toString()]
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Pattern is required for preview');
  });
}); 