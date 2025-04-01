const mongoose = require('mongoose');
const Rule = require('../../src/models/Rule');
const { setupDB } = require('../setup');

// Setup test database
setupDB();

describe('Rule Model', () => {
  beforeEach(async () => {
    await Rule.deleteMany({});
  });

  it('should create an edit rule', async () => {
    const rule = await Rule.create({
      name: 'Test Edit Rule',
      type: 'edit',
      pattern: 'GROCERY',
      newDescription: 'GROCERIES',
      sourceAccounts: []
    });

    expect(rule.type).toBe('edit');
    expect(rule.pattern).toBe('GROCERY');
    expect(rule.newDescription).toBe('GROCERIES');
  });

  it('should create a merge rule', async () => {
    const rule = await Rule.create({
      name: 'Test Merge Rule',
      type: 'merge',
      pattern: 'GROCERY',
      maxDateDifference: 3,
      sourceAccounts: []
    });

    expect(rule.type).toBe('merge');
    expect(rule.pattern).toBe('GROCERY');
    expect(rule.maxDateDifference).toBe(3);
  });

  it('should create a complementary rule', async () => {
    const rule = await Rule.create({
      name: 'Test Complementary Rule',
      type: 'complementary',
      pattern: 'GROCERY',
      sourceAccounts: [],
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0.6
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0.4
        }
      ]
    });

    expect(rule.type).toBe('complementary');
    expect(rule.pattern).toBe('GROCERY');
    expect(rule.destinationAccounts).toHaveLength(2);
    expect(rule.destinationAccounts[0].ratio).toBe(0.6);
    expect(rule.destinationAccounts[1].ratio).toBe(0.4);
  });

  it('should validate required fields', async () => {
    const rule = new Rule({
      // Missing required fields
      type: 'edit'
    });

    await expect(rule.save()).rejects.toThrow();
  });

  it('should validate pattern format', async () => {
    const rule = new Rule({
      name: 'Test Rule',
      type: 'edit',
      pattern: '[', // Invalid regex pattern
      newDescription: 'GROCERIES',
      sourceAccounts: []
    });

    await expect(rule.save()).rejects.toThrow();
  });

  it('should validate destination accounts ratios', async () => {
    const rule = new Rule({
      name: 'Test Rule',
      type: 'complementary',
      pattern: 'GROCERY',
      sourceAccounts: [],
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0.6
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0.6 // Sum > 1
        }
      ]
    });

    await expect(rule.save()).rejects.toThrow();
  });
}); 