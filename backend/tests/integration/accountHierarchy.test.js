const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Account = require('../../src/models/Account');
const { setupDB } = require('../setup');
const Transaction = require('../../src/models/Transaction');

// Setup fresh database
setupDB();

describe('Account Hierarchy API', () => {
  let rootAccount1, rootAccount2;
  let childAccount1, childAccount2, childAccount3;
  let grandchildAccount1, grandchildAccount2;

  beforeEach(async () => {
    // Create root accounts
    rootAccount1 = await Account.create({
      name: 'Root Account 1',
      type: 'asset',
      isActive: true
    });

    rootAccount2 = await Account.create({
      name: 'Root Account 2',
      type: 'expense',
      isActive: true
    });

    // Create child accounts
    childAccount1 = await Account.create({
      name: 'Child Account 1',
      type: 'asset',
      parent: rootAccount1._id,
      isActive: true
    });

    childAccount2 = await Account.create({
      name: 'Child Account 2',
      type: 'asset',
      parent: rootAccount1._id,
      isActive: true
    });

    childAccount3 = await Account.create({
      name: 'Child Account 3',
      type: 'expense',
      parent: rootAccount2._id,
      isActive: true
    });

    // Create grandchild accounts
    grandchildAccount1 = await Account.create({
      name: 'Grandchild Account 1',
      type: 'asset',
      parent: childAccount1._id,
      isActive: true
    });

    grandchildAccount2 = await Account.create({
      name: 'Grandchild Account 2',
      type: 'asset',
      parent: childAccount1._id,
      isActive: true
    });
  });

  describe('GET /api/accounts/hierarchy', () => {
    it('should return the complete account hierarchy', async () => {
      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Two root accounts

      // Check root account 1 and its children
      const root1 = response.body.data.find(a => a._id.toString() === rootAccount1._id.toString());
      expect(root1).toBeDefined();
      expect(root1.children).toHaveLength(2);
      expect(root1.children.map(c => c.name)).toContain('Child Account 1');
      expect(root1.children.map(c => c.name)).toContain('Child Account 2');

      // Check child account 1 and its children
      const child1 = root1.children.find(c => c._id.toString() === childAccount1._id.toString());
      expect(child1).toBeDefined();
      expect(child1.children).toHaveLength(2);
      expect(child1.children.map(c => c.name)).toContain('Grandchild Account 1');
      expect(child1.children.map(c => c.name)).toContain('Grandchild Account 2');

      // Check root account 2 and its children
      const root2 = response.body.data.find(a => a._id.toString() === rootAccount2._id.toString());
      expect(root2).toBeDefined();
      expect(root2.children).toHaveLength(1);
      expect(root2.children[0].name).toBe('Child Account 3');
    });

    it('should handle accounts with no children', async () => {
      // Create a root account with no children
      const lonelyAccount = await Account.create({
        name: 'Lonely Account',
        type: 'asset',
        isActive: true
      });

      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      const account = response.body.data.find(a => a._id.toString() === lonelyAccount._id.toString());
      expect(account).toBeDefined();
      expect(account.children).toHaveLength(0);
    });

    it('should handle inactive accounts', async () => {
      // Create an inactive root account
      const inactiveAccount = await Account.create({
        name: 'Inactive Account',
        type: 'asset',
        isActive: false
      });

      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      const account = response.body.data.find(a => a._id.toString() === inactiveAccount._id.toString());
      expect(account).toBeDefined();
      expect(account.isActive).toBe(false);
    });

    it('should handle deeply nested accounts', async () => {
      // Create a deeply nested account structure (4 levels)
      const level1 = await Account.create({
        name: 'Level 1',
        type: 'asset',
        isActive: true
      });

      const level2 = await Account.create({
        name: 'Level 2',
        type: 'asset',
        parent: level1._id,
        isActive: true
      });

      const level3 = await Account.create({
        name: 'Level 3',
        type: 'asset',
        parent: level2._id,
        isActive: true
      });

      const level4 = await Account.create({
        name: 'Level 4',
        type: 'asset',
        parent: level3._id,
        isActive: true
      });

      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      // Verify the complete hierarchy
      const account = response.body.data.find(a => a._id.toString() === level1._id.toString());
      expect(account).toBeDefined();
      expect(account.children).toHaveLength(1);
      expect(account.children[0].children).toHaveLength(1);
      expect(account.children[0].children[0].children).toHaveLength(1);
      expect(account.children[0].children[0].children[0].name).toBe('Level 4');
    });

    it('should handle accounts with transaction counts', async () => {
      // Create a root account with a transaction count
      const accountWithTransactions = await Account.create({
        name: 'Account With Transactions',
        type: 'asset',
        isActive: true
      });

      // Create a child account
      const childAccount = await Account.create({
        name: 'Child Account',
        type: 'asset',
        parent: accountWithTransactions._id,
        isActive: true
      });

      // Create transactions for the parent account
      await Transaction.create({
        date: new Date(),
        description: 'Parent Transaction 1',
        entries: [{
          account: accountWithTransactions._id,
          amount: 100,
          type: 'debit'
        }]
      });

      await Transaction.create({
        date: new Date(),
        description: 'Parent Transaction 2',
        entries: [{
          account: accountWithTransactions._id,
          amount: 200,
          type: 'credit'
        }]
      });

      // Create transactions for the child account
      await Transaction.create({
        date: new Date(),
        description: 'Child Transaction 1',
        entries: [{
          account: childAccount._id,
          amount: 300,
          type: 'debit'
        }]
      });

      await Transaction.create({
        date: new Date(),
        description: 'Child Transaction 2',
        entries: [{
          account: childAccount._id,
          amount: 400,
          type: 'credit'
        }]
      });

      await Transaction.create({
        date: new Date(),
        description: 'Child Transaction 3',
        entries: [{
          account: childAccount._id,
          amount: 500,
          type: 'debit'
        }]
      });

      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      // Debug what we're getting
      console.log('Root Accounts:', JSON.stringify(response.body.data));
      
      const account = response.body.data.find(a => a._id.toString() === accountWithTransactions._id.toString());
      console.log('Found Account:', JSON.stringify(account));
      
      expect(account).toBeDefined();
      // Parent account should have 5 total transactions (2 direct + 3 from child)
      expect(account.totalTransactionCount).toBe(5);

      const child = account.children.find(c => c._id.toString() === childAccount._id.toString());
      console.log('Found Child:', JSON.stringify(child));
      
      expect(child).toBeDefined();
      // Child account should have 3 direct transactions
      expect(child.totalTransactionCount).toBe(3);
    });

    it('should handle circular references gracefully', async () => {
      // Create two accounts that reference each other
      const account1 = await Account.create({
        name: 'Account 1',
        type: 'asset',
        isActive: true
      });

      const account2 = await Account.create({
        name: 'Account 2',
        type: 'asset',
        parent: account1._id,
        isActive: true
      });

      // Try to create a circular reference (should fail)
      account1.parent = account2._id;
      await expect(account1.save()).rejects.toThrow();
    });
  });
}); 