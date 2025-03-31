const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { expect } = chai;
const app = require('../../src/server');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const EntryLine = require('../../src/models/EntryLine');
const Account = require('../../src/models/Account');

chai.use(chaiHttp);

let testAccountIds = {
  checking: null,
  groceries: null,
  utilities: null
};

let testRuleId = null;
let testTransactionId = null;

describe('Rule API Integration Tests', function() {
  this.timeout(10000); // Increase timeout for CI environment

  // Setup test data before running all tests
  before(async () => {
    // Connect to test database
    const url = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/household-finance-test';
    await mongoose.connect(url);

    // Clean database
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
    await EntryLine.deleteMany({});
    await Account.deleteMany({});

    // Create test accounts
    const checking = await Account.create({
      name: 'Checking Account',
      type: 'Asset',
      description: 'Main checking account'
    });

    const groceries = await Account.create({
      name: 'Groceries',
      type: 'Expense',
      description: 'Grocery expenses'
    });

    const utilities = await Account.create({
      name: 'Utilities',
      type: 'Expense',
      description: 'Utility expenses'
    });

    testAccountIds.checking = checking._id;
    testAccountIds.groceries = groceries._id;
    testAccountIds.utilities = utilities._id;
  });

  // Close connection after all tests
  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  // Clean up after each test if needed
  afterEach(async () => {
    // Clean up any specific test data if needed
  });

  describe('POST /api/rules', () => {
    it('should create a new rule with valid data', async () => {
      const ruleData = {
        name: 'Grocery Rule',
        description: 'Automatically categorize grocery expenses',
        pattern: 'Grocery|Supermarket',
        sourceAccount: testAccountIds.checking,
        destinationAccounts: [
          {
            accountId: testAccountIds.groceries,
            ratio: 1,
            absoluteAmount: 0
          }
        ],
        priority: 10,
        isEnabled: true
      };

      const res = await chai.request(app)
        .post('/api/rules')
        .send(ruleData);

      expect(res).to.have.status(201);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('_id');
      expect(res.body.data.name).to.equal(ruleData.name);
      expect(res.body.data.pattern).to.equal(ruleData.pattern);
      expect(res.body.data.sourceAccount).to.have.property('_id');
      expect(res.body.data.sourceAccount.name).to.equal('Checking Account');
      expect(res.body.data.destinationAccounts).to.be.an('array');
      expect(res.body.data.destinationAccounts).to.have.length(1);
      expect(res.body.data.destinationAccounts[0].accountId.name).to.equal('Groceries');

      // Save the rule ID for later tests
      testRuleId = res.body.data._id;
    });

    it('should return validation error with invalid data', async () => {
      const invalidData = {
        description: 'Missing required fields',
        sourceAccount: testAccountIds.checking
      };

      const res = await chai.request(app)
        .post('/api/rules')
        .send(invalidData);

      expect(res).to.have.status(400);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('validation');
    });
  });

  describe('GET /api/rules', () => {
    it('should return all rules', async () => {
      const res = await chai.request(app)
        .get('/api/rules');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data).to.have.length.of.at.least(1);
    });
  });

  describe('GET /api/rules/:id', () => {
    it('should return a specific rule', async () => {
      const res = await chai.request(app)
        .get(`/api/rules/${testRuleId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('_id');
      expect(res.body.data._id).to.equal(testRuleId);
    });

    it('should return 404 for non-existent rule', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await chai.request(app)
        .get(`/api/rules/${nonExistentId}`);

      expect(res).to.have.status(404);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
    });
  });

  describe('PUT /api/rules/:id', () => {
    it('should update an existing rule', async () => {
      const updateData = {
        name: 'Updated Grocery Rule',
        pattern: 'Grocery|Supermarket|FoodMart',
        priority: 20
      };

      const res = await chai.request(app)
        .put(`/api/rules/${testRuleId}`)
        .send(updateData);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data.name).to.equal(updateData.name);
      expect(res.body.data.pattern).to.equal(updateData.pattern);
      expect(res.body.data.priority).to.equal(updateData.priority);
    });

    it('should return 404 for updating non-existent rule', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await chai.request(app)
        .put(`/api/rules/${nonExistentId}`)
        .send({ name: 'Test Update' });

      expect(res).to.have.status(404);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
    });
  });

  describe('POST /api/rules/:id/test', () => {
    it('should correctly test a rule against a description that matches', async () => {
      const testData = {
        description: 'Grocery Store Purchase',
        amount: 100
      };

      const res = await chai.request(app)
        .post(`/api/rules/${testRuleId}/test`)
        .send(testData);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data.isMatch).to.be.true;
      expect(res.body.data.destinationEntries).to.be.an('array');
      expect(res.body.data.destinationEntries).to.have.length(1);
      expect(res.body.data.destinationEntries[0].accountId.toString()).to.equal(testAccountIds.groceries.toString());
      expect(res.body.data.destinationEntries[0].amount).to.equal(-100); // Negative for credit entry
    });

    it('should correctly test a rule against a description that does not match', async () => {
      const testData = {
        description: 'Gas Station',
        amount: 50
      };

      const res = await chai.request(app)
        .post(`/api/rules/${testRuleId}/test`)
        .send(testData);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.data.isMatch).to.be.false;
      expect(res.body.data.destinationEntries).to.be.an('array');
      expect(res.body.data.destinationEntries).to.have.length(0);
    });
  });

  describe('Rule application to transactions', () => {
    beforeEach(async () => {
      // Create a test transaction with unbalanced entry
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'Grocery Shopping',
        status: 'Unbalanced',
        isBalanced: false
      });
      
      // Create a debit entry for the transaction
      await EntryLine.create({
        transactionId: transaction._id,
        accountId: testAccountIds.checking,
        amount: 150,
        type: 'debit',
        description: 'Grocery payment'
      });
      
      testTransactionId = transaction._id;
    });
    
    afterEach(async () => {
      // Clean up test transaction and entries
      await Transaction.deleteMany({});
      await EntryLine.deleteMany({});
    });

    describe('POST /api/rules/apply/:transactionId', () => {
      it('should apply rules to an unbalanced transaction', async () => {
        const res = await chai.request(app)
          .post(`/api/rules/apply/${testTransactionId}`);

        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('appliedRule');
        expect(res.body.data.appliedRule).to.equal(testRuleId);
        expect(res.body.data).to.have.property('createdEntries');
        expect(res.body.data.createdEntries).to.be.an('array');
        expect(res.body.data.createdEntries).to.have.length(1);
        expect(res.body.data.isNowBalanced).to.be.true;
        
        // Verify the transaction has been updated to balanced
        const updatedTransaction = await Transaction.findById(testTransactionId);
        expect(updatedTransaction.status).to.equal('Balanced');
        expect(updatedTransaction.isBalanced).to.be.true;
        
        // Verify the new entry was created
        const entries = await EntryLine.find({ transactionId: testTransactionId });
        expect(entries).to.have.length(2); // Original entry + new rule-generated entry
        
        // Verify the new entry has the correct values
        const newEntry = entries.find(e => e.accountId.toString() === testAccountIds.groceries.toString());
        expect(newEntry).to.exist;
        expect(newEntry.amount).to.equal(-150); // Negative for credit entry
      });
    });

    describe('POST /api/rules/apply-all', () => {
      it('should apply rules to all unbalanced transactions', async () => {
        const res = await chai.request(app)
          .post('/api/rules/apply-all');

        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('total');
        expect(res.body.data.total).to.be.at.least(1);
        expect(res.body.data).to.have.property('successful');
        expect(res.body.data.successful).to.be.at.least(1);
        expect(res.body.data).to.have.property('details');
        expect(res.body.data.details).to.be.an('array');
      });
    });
  });

  describe('DELETE /api/rules/:id', () => {
    it('should delete an existing rule', async () => {
      const res = await chai.request(app)
        .delete(`/api/rules/${testRuleId}`);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;

      // Verify rule has been deleted
      const checkRule = await Rule.findById(testRuleId);
      expect(checkRule).to.be.null;
    });

    it('should return 404 for deleting non-existent rule', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await chai.request(app)
        .delete(`/api/rules/${nonExistentId}`);

      expect(res).to.have.status(404);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
    });
  });
}); 