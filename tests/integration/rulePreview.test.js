const request = require('supertest');
const app = require('../../src/app');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const mongoose = require('mongoose');

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
          account: testAccount._id,
          amount: 50,
          entryType: 'debit',
          memo: 'Groceries'
        },
        {
          account: mongoose.Types.ObjectId(), // Some other account
          amount: 50,
          entryType: 'credit',
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
    expect(response.body.message).toContain('pattern is required');
  });
}); 