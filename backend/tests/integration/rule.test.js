const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup test database
setupDB();

describe('Rule API', () => {
  let assetAccount;
  let expenseAccount;
  let incomeAccount;
  let authToken;
  
  beforeAll(async () => {
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
    
    // Get auth token (you'll need to implement this based on your auth system)
    authToken = 'test-auth-token';
  });
  
  beforeEach(async () => {
    await Rule.deleteMany({});
    await Transaction.deleteMany({});
  });
  
  describe('POST /api/rules', () => {
    it('should create an edit rule', async () => {
      const response = await request(app)
        .post('/api/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Edit Rule',
          type: 'edit',
          pattern: 'GROCERY',
          newDescription: 'GROCERIES',
          sourceAccounts: [assetAccount._id]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('edit');
      expect(response.body.data.pattern).toBe('GROCERY');
      expect(response.body.data.newDescription).toBe('GROCERIES');
    });
    
    it('should create a merge rule', async () => {
      const response = await request(app)
        .post('/api/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Merge Rule',
          type: 'merge',
          pattern: 'GROCERY',
          maxDateDifference: 3,
          sourceAccounts: [assetAccount._id]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('merge');
      expect(response.body.data.pattern).toBe('GROCERY');
    });
    
    it('should create a complementary rule', async () => {
      const response = await request(app)
        .post('/api/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Complementary Rule',
          type: 'complementary',
          pattern: 'GROCERY',
          sourceAccounts: [assetAccount._id],
          destinationAccounts: [
            {
              accountId: expenseAccount._id,
              ratio: 0.6
            },
            {
              accountId: incomeAccount._id,
              ratio: 0.4
            }
          ]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('complementary');
      expect(response.body.data.sourceAccounts).toBeInstanceOf(Array);
      expect(response.body.data.destinationAccounts).toHaveLength(2);
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          type: 'edit'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('New description is required for edit rules');
    });
  });
  
  describe('GET /api/rules', () => {
    beforeEach(async () => {
      // Create test rules
      await Rule.create({
        name: 'Edit Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'TESTED',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      await Rule.create({
        name: 'Merge Rule',
        type: 'merge',
        pattern: 'TEST',
        maxDateDifference: 3,
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      await Rule.create({
        name: 'Complementary Rule',
        type: 'complementary',
        pattern: 'TEST',
        sourceAccounts: [assetAccount._id],
        destinationAccounts: [
          {
            accountId: expenseAccount._id,
            ratio: 0.7
          },
          {
            accountId: incomeAccount._id,
            ratio: 0.3
          }
        ],
        autoApply: true
      });
    });
    
    it('should get all rules', async () => {
      const response = await request(app)
        .get('/api/rules')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });
    
    it('should filter rules by type', async () => {
      const response = await request(app)
        .get('/api/rules')
        .query({ type: 'edit' })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('edit');
    });
  });
  
  describe('GET /api/rules/:id', () => {
    let rule;
    
    beforeEach(async () => {
      rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'TESTED',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
    });
    
    it('should get a single rule', async () => {
      const response = await request(app)
        .get(`/api/rules/${rule._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(rule._id.toString());
    });
    
    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .get(`/api/rules/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Rule not found');
    });
  });
  
  describe('PUT /api/rules/:id', () => {
    let rule;
    
    beforeEach(async () => {
      rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'TESTED',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
    });
    
    it('should update a rule', async () => {
      const response = await request(app)
        .put(`/api/rules/${rule._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Rule',
          pattern: 'UPDATED',
          newDescription: 'UPDATED-TEST',
          type: 'edit',
          sourceAccounts: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Rule');
      expect(response.body.data.pattern).toBe('UPDATED');
      expect(response.body.data.newDescription).toBe('UPDATED-TEST');
    });
  });
  
  describe('DELETE /api/rules/:id', () => {
    let rule;
    
    beforeEach(async () => {
      rule = await Rule.create({
        name: 'Test Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'TESTED',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
    });
    
    it('should delete a rule', async () => {
      const response = await request(app)
        .delete(`/api/rules/${rule._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rule deleted successfully');
      
      const deletedRule = await Rule.findById(rule._id);
      expect(deletedRule).toBeNull();
    });
  });
  
  describe('POST /api/rules/:id/apply', () => {
    let rule;
    let transaction;
    
    beforeEach(async () => {
      rule = await Rule.create({
        name: 'Test Edit Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'TESTED',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      transaction = await Transaction.create({
        date: new Date(),
        description: 'Test Transaction',
        entries: [{
          accountId: assetAccount._id,
          amount: 100,
          type: 'debit'
        }]
      });
    });
    
    it('should apply a rule to a transaction', async () => {
      const response = await request(app)
        .post(`/api/rules/${rule._id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transactionId: transaction._id });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.description).toBe('TESTED');
    });
  });
}); 