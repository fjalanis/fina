const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');

// Setup fresh database
setupDB();

describe('Account API Endpoints', () => {
  // Test data
  const testAccount = {
    name: 'Test Account',
    type: 'asset',
    description: 'This is a test account',
    isActive: true
  };
  
  const parentAccount = {
    name: 'Parent Account',
    type: 'asset',
    description: 'This is a parent account',
    isActive: true
  };
  
  const childAccount = {
    name: 'Child Account',
    type: 'asset',
    description: 'This is a child account',
    isActive: true
  };

  // Test 1: Create account
  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send(testAccount);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testAccount.name);
      expect(res.body.data.type).toBe(testAccount.type);
      expect(res.body.data.description).toBe(testAccount.description);
    });

    it('should return validation error if name is missing', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({
          type: 'asset',
          description: 'Invalid account'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });
  });

  // Test 2: Get all accounts
  describe('GET /api/accounts', () => {
    it('should get all accounts', async () => {
      // Create test account first
      await Account.create(testAccount);
      
      const res = await request(app).get('/api/accounts');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // Test 3: Get single account
  describe('GET /api/accounts/:id', () => {
    it('should get account by ID', async () => {
      // Create test account first
      const account = await Account.create(testAccount);
      
      const res = await request(app).get(`/api/accounts/${account._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(account._id.toString());
      expect(res.body.data.name).toBe(account.name);
    });

    it('should return 404 if account does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/accounts/${fakeId}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });

  // Test 4: Update account
  describe('PUT /api/accounts/:id', () => {
    it('should update an account', async () => {
      // Create test account first
      const account = await Account.create(testAccount);
      
      const updatedData = {
        name: 'Updated Account',
        description: 'This account has been updated'
      };
      
      const res = await request(app)
        .put(`/api/accounts/${account._id}`)
        .send(updatedData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updatedData.name);
      expect(res.body.data.description).toBe(updatedData.description);
      // Type should remain unchanged
      expect(res.body.data.type).toBe(account.type);
    });
  });

  // Test 5: Delete account
  describe('DELETE /api/accounts/:id', () => {
    it('should delete an account', async () => {
      // Create test account first
      const account = await Account.create(testAccount);
      
      const res = await request(app).delete(`/api/accounts/${account._id}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Verify account is deleted
      const deletedAccount = await Account.findById(account._id);
      expect(deletedAccount).toBeNull();
    });

    it('should prevent deleting an account with children', async () => {
      // Create parent account
      const parent = await Account.create(parentAccount);
      
      // Create child account with parent reference
      await Account.create({
        ...childAccount,
        parent: parent._id
      });
      
      // Try to delete the parent
      const res = await request(app).delete(`/api/accounts/${parent._id}`);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cannot delete account with child accounts');
      
      // Verify parent still exists by querying fresh
      const existingParent = await Account.findById(parent._id);
      expect(existingParent).not.toBeNull();
    });
  });

  // Test 6: Account Hierarchy
  describe('Account Parent-Child Relationship', () => {
    it('should establish parent-child relationship', async () => {
      // Create parent account
      const parent = await Account.create(parentAccount);
      
      // Create child account with parent reference
      const child = await Account.create({
        ...childAccount,
        parent: parent._id
      });
      
      // Get the child with populated parent
      const childWithParent = await Account.findById(child._id).populate('parent');
      
      expect(childWithParent.parent).not.toBeNull();
      expect(childWithParent.parent._id.toString()).toBe(parent._id.toString());
      expect(childWithParent.parent.name).toBe(parent.name);
    });

    it('should get account hierarchy', async () => {
      // Create parent account
      const parent = await Account.create(parentAccount);
      const parentId = parent._id;
      
      // Create child accounts with parent reference
      await Account.create({
        name: 'Child 1',
        type: 'asset',
        parent: parentId
      });
      
      await Account.create({
        name: 'Child 2',
        type: 'asset',
        parent: parentId
      });
      
      // Get hierarchy
      const res = await request(app).get('/api/accounts/hierarchy');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      
      // Find the parent in the hierarchy
      const parentInHierarchy = res.body.data.find(
        account => account._id === parentId.toString()
      );
      
      // Parent should exist in the response
      expect(parentInHierarchy).toBeDefined();
      
      // Verify parent still exists
      const parentWithChildren = await Account.findById(parentId).populate('children');
      expect(parentWithChildren).not.toBeNull();
      
      // Parent should have children
      expect(parentWithChildren.children.length).toBe(2);
    });

    it('should prevent circular parent references', async () => {
      // Create an account
      const account = await Account.create(testAccount);
      
      // Try to make the account its own parent
      const res = await request(app)
        .put(`/api/accounts/${account._id}`)
        .send({ parent: account._id });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Account cannot be its own parent');
    });
  });
}); 