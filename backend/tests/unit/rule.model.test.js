const mongoose = require('mongoose');
const Rule = require('../../src/models/Rule');
const { expect } = require('chai');

// Create a clean database connection for testing
before(async () => {
  // Use a test database
  const url = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/household-finance-test';
  await mongoose.connect(url);
});

// Close connection after all tests
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Rule Model', () => {
  // Clean up the database before each test
  beforeEach(async () => {
    await Rule.deleteMany({});
  });

  it('should create a valid rule', async () => {
    const ruleData = {
      name: 'Groceries Rule',
      description: 'Automatically categorize grocery expenses',
      pattern: 'Grocery|Supermarket',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0
        }
      ],
      priority: 5,
      isEnabled: true
    };

    const rule = new Rule(ruleData);
    const savedRule = await rule.save();

    expect(savedRule).to.have.property('_id');
    expect(savedRule.name).to.equal(ruleData.name);
    expect(savedRule.pattern).to.equal(ruleData.pattern);
    expect(savedRule.priority).to.equal(ruleData.priority);
    expect(savedRule.isEnabled).to.equal(ruleData.isEnabled);
    expect(savedRule.destinationAccounts).to.have.length(1);
    expect(savedRule.createdAt).to.be.a('date');
    expect(savedRule.updatedAt).to.be.a('date');
  });

  it('should require name and pattern', async () => {
    const ruleData = {
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0
        }
      ]
    };

    const rule = new Rule(ruleData);
    
    let error = null;
    try {
      await rule.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).to.exist;
    expect(error.errors.name).to.exist;
    expect(error.errors.pattern).to.exist;
  });

  it('should require at least one destination account', async () => {
    const ruleData = {
      name: 'Test Rule',
      pattern: 'Test',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: []
    };

    const rule = new Rule(ruleData);
    
    let error = null;
    try {
      await rule.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).to.exist;
    expect(error.errors.destinationAccounts).to.exist;
  });

  it('should match descriptions correctly using the pattern', async () => {
    const rule = new Rule({
      name: 'Grocery Rule',
      pattern: 'Grocery|Supermarket',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0
        }
      ]
    });

    // Should match
    expect(rule.matchesDescription('Grocery Store')).to.be.true;
    expect(rule.matchesDescription('Supermarket Purchase')).to.be.true;
    expect(rule.matchesDescription('Local Supermarket')).to.be.true;
    
    // Should not match
    expect(rule.matchesDescription('Restaurant')).to.be.false;
    expect(rule.matchesDescription('Gas Station')).to.be.false;
    expect(rule.matchesDescription(null)).to.be.false;
    expect(rule.matchesDescription(undefined)).to.be.false;
  });

  it('should calculate destination amounts correctly using ratio', async () => {
    const rule = new Rule({
      name: 'Split Rule',
      pattern: 'Test',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 2,
          absoluteAmount: 0
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0
        }
      ]
    });

    const sourceAmount = 300;
    const result = rule.calculateDestinationAmounts(sourceAmount);
    
    expect(result).to.have.length(2);
    expect(result[0].amount).to.equal(-200); // 2/3 of 300 = 200, negative for credit
    expect(result[1].amount).to.equal(-100); // 1/3 of 300 = 100, negative for credit
  });

  it('should calculate destination amounts correctly using absolute amounts', async () => {
    const rule = new Rule({
      name: 'Fixed Amount Rule',
      pattern: 'Test',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0,
          absoluteAmount: 50
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 0,
          absoluteAmount: 150
        }
      ]
    });

    const sourceAmount = 500; // This should be ignored for fixed amounts
    const result = rule.calculateDestinationAmounts(sourceAmount);
    
    expect(result).to.have.length(2);
    expect(result[0].amount).to.equal(-50); // Fixed amount, negative for credit
    expect(result[1].amount).to.equal(-150); // Fixed amount, negative for credit
  });

  it('should prioritize absoluteAmount over ratio if both are set', async () => {
    const rule = new Rule({
      name: 'Mixed Rule',
      pattern: 'Test',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 75 // This should be used
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0 // Ratio should be used
        }
      ]
    });

    const sourceAmount = 200;
    const result = rule.calculateDestinationAmounts(sourceAmount);
    
    expect(result).to.have.length(2);
    expect(result[0].amount).to.equal(-75); // Fixed amount, negative for credit
    expect(result[1].amount).to.equal(-200); // 1/1 of 200 = 200, negative for credit (only one ratio entry)
  });

  it('should return empty array for zero source amount', async () => {
    const rule = new Rule({
      name: 'Test Rule',
      pattern: 'Test',
      sourceAccount: new mongoose.Types.ObjectId(),
      destinationAccounts: [
        {
          accountId: new mongoose.Types.ObjectId(),
          ratio: 1,
          absoluteAmount: 0
        }
      ]
    });

    const result = rule.calculateDestinationAmounts(0);
    expect(result).to.have.length(0);
  });
}); 