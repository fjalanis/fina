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
    // Clear DB first
    await Account.deleteMany({});
    await Transaction.deleteMany({}); // Also clear transactions

    // Create root accounts
    rootAccount1 = await Account.create({
      name: 'Root Account 1',
      type: 'asset',
      isActive: true,
      unit: 'USD'
    });

    rootAccount2 = await Account.create({
      name: 'Root Account 2',
      type: 'expense',
      isActive: true,
      unit: 'USD'
    });

    // Create child accounts
    childAccount1 = await Account.create({
      name: 'Child Account 1',
      type: 'asset',
      parent: rootAccount1._id,
      isActive: true,
      unit: 'USD'
    });

    childAccount2 = await Account.create({
      name: 'Child Account 2',
      type: 'asset',
      parent: rootAccount1._id,
      isActive: true,
      unit: 'USD'
    });

    childAccount3 = await Account.create({
      name: 'Child Account 3',
      type: 'expense',
      parent: rootAccount2._id,
      isActive: true,
      unit: 'USD'
    });

    // Create grandchild accounts
    grandchildAccount1 = await Account.create({
      name: 'Grandchild Account 1',
      type: 'asset',
      parent: childAccount1._id,
      isActive: true,
      unit: 'USD'
    });

    grandchildAccount2 = await Account.create({
      name: 'Grandchild Account 2',
      type: 'asset',
      parent: childAccount1._id,
      isActive: true,
      unit: 'USD'
    });
  });

  afterEach(async () => {
    await Account.deleteMany({});
    await Transaction.deleteMany({});
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
        isActive: true,
        unit: 'USD'
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
        isActive: false,
        unit: 'USD'
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
        isActive: true,
        unit: 'USD'
      });

      const level2 = await Account.create({
        name: 'Level 2',
        type: 'asset',
        parent: level1._id,
        isActive: true,
        unit: 'USD'
      });

      const level3 = await Account.create({
        name: 'Level 3',
        type: 'asset',
        parent: level2._id,
        isActive: true,
        unit: 'USD'
      });

      const level4 = await Account.create({
        name: 'Level 4',
        type: 'asset',
        parent: level3._id,
        isActive: true,
        unit: 'USD'
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
      // Use the accounts created in beforeEach (rootAccount1, childAccount1, childAccount2)
      await Transaction.create({ date: new Date(), description: 'T1', entries: [{ accountId: rootAccount1._id, amount: 100, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date(), description: 'T2', entries: [{ accountId: childAccount1._id, amount: 50, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date(), description: 'T3', entries: [{ accountId: childAccount2._id, amount: 25, type: 'debit', unit: 'USD' }] });

      const response = await request(app)
        .get('/api/accounts/hierarchy')
        .expect(200);

      // Find rootAccount1 in the response
      const account = response.body.data.find(a => a._id.toString() === rootAccount1._id.toString());
      expect(account).toBeDefined();
      // Parent account (rootAccount1) should have 3 total transactions (1 direct + 2 from children)
      expect(account.totalTransactionCount).toBe(3);

      // Find childAccount1 within rootAccount1's children
      const child1 = account.children.find(c => c._id.toString() === childAccount1._id.toString());
      expect(child1).toBeDefined();
      // Child account1 should have 1 direct transaction
      expect(child1.totalTransactionCount).toBe(1);
      
      // Find childAccount2 within rootAccount1's children
      const child2 = account.children.find(c => c._id.toString() === childAccount2._id.toString());
      expect(child2).toBeDefined();
      // Child account2 should have 1 direct transaction
      expect(child2.totalTransactionCount).toBe(1);
    });

    it('should handle accounts with transaction counts unfiltered by date', async () => {
      // Use the accounts created in beforeEach
      await Transaction.create({ date: new Date('2023-01-15'), description: 'T1', entries: [{ accountId: rootAccount1._id, amount: 100, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date('2023-02-15'), description: 'T2', entries: [{ accountId: childAccount1._id, amount: 50, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date('2023-03-15'), description: 'T3', entries: [{ accountId: childAccount2._id, amount: 25, type: 'debit', unit: 'USD' }] });

      // Request without date filters
      const response = await request(app)
        .get('/api/accounts/hierarchy') // No date params
        .expect(200);

      const account = response.body.data.find(a => a._id.toString() === rootAccount1._id.toString());
      expect(account).toBeDefined();
      // Expect all 3 transactions to be counted
      expect(account.totalTransactionCount).toBe(3);
      expect(account.transactionCount).toBe(1); // Direct count for root

      const child1 = account.children.find(c => c._id.toString() === childAccount1._id.toString());
      expect(child1).toBeDefined();
      expect(child1.totalTransactionCount).toBe(1);
      expect(child1.transactionCount).toBe(1); // Direct count for child1

      const child2 = account.children.find(c => c._id.toString() === childAccount2._id.toString());
      expect(child2).toBeDefined();
      expect(child2.totalTransactionCount).toBe(1);
      expect(child2.transactionCount).toBe(1); // Direct count for child2
    });

    it('should correctly filter transaction counts by date range', async () => {
      // Use the accounts created in beforeEach
      await Transaction.create({ date: new Date('2023-01-15'), description: 'T1-out', entries: [{ accountId: rootAccount1._id, amount: 10, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date('2023-02-10'), description: 'T2-in', entries: [{ accountId: rootAccount1._id, amount: 100, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date('2023-02-15'), description: 'T3-in', entries: [{ accountId: childAccount1._id, amount: 50, type: 'debit', unit: 'USD' }] });
      await Transaction.create({ date: new Date('2023-03-15'), description: 'T4-out', entries: [{ accountId: childAccount2._id, amount: 25, type: 'debit', unit: 'USD' }] });

      const startDate = '2023-02-01';
      const endDate = '2023-02-28';

      // Request WITH date filters
      const response = await request(app)
        .get(`/api/accounts/hierarchy?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      const account = response.body.data.find(a => a._id.toString() === rootAccount1._id.toString());
      expect(account).toBeDefined();
      // Only T2-in and T3-in should be counted
      expect(account.totalTransactionCount).toBe(2);
      expect(account.transactionCount).toBe(1); // Direct count for root (T2-in)

      const child1 = account.children.find(c => c._id.toString() === childAccount1._id.toString());
      expect(child1).toBeDefined();
      expect(child1.totalTransactionCount).toBe(1);
      expect(child1.transactionCount).toBe(1); // Direct count for child1 (T3-in)

      const child2 = account.children.find(c => c._id.toString() === childAccount2._id.toString());
      expect(child2).toBeDefined();
      // T4-out is outside the date range
      expect(child2.totalTransactionCount).toBe(0);
      expect(child2.transactionCount).toBe(0); // Direct count for child2
    });

    it('should correctly calculate debits and credits within date range', async () => {
      // Create transactions in and out of range
      await Transaction.create({ date: new Date('2023-01-05'), description: 'Outside range', entries: [
        { accountId: childAccount1._id, amount: 1000, type: 'debit', unit: 'USD' },
      ] });
      await Transaction.create({ date: new Date('2023-02-05'), description: 'Inside range 1', entries: [
        { accountId: rootAccount1._id, amount: 100, type: 'debit', unit: 'USD' },
        { accountId: childAccount1._id, amount: 50, type: 'credit', unit: 'USD' },
      ] });
      await Transaction.create({ date: new Date('2023-02-15'), description: 'Inside range 2', entries: [
        { accountId: childAccount1._id, amount: 200, type: 'debit', unit: 'USD' },
        { accountId: grandchildAccount1._id, amount: 75, type: 'credit', unit: 'USD' },
      ] });
      await Transaction.create({ date: new Date('2023-03-05'), description: 'Outside range 2', entries: [
        { accountId: rootAccount1._id, amount: 500, type: 'credit', unit: 'USD' },
      ] });

      const startDate = '2023-02-01';
      const endDate = '2023-02-28';

      const response = await request(app)
        .get(`/api/accounts/hierarchy?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      // Root 1 checks
      const root1 = response.body.data.find(a => a._id.toString() === rootAccount1._id.toString());
      expect(root1).toBeDefined();
      expect(root1.debits).toBe(100); // Direct debit from Inside range 1
      expect(root1.credits).toBe(0);   // No direct credits in range
      expect(root1.totalDebits).toBe(100 + 200); // root1 debit + child1 debit
      expect(root1.totalCredits).toBe(50 + 75); // child1 credit + grandchild1 credit

      // Child 1 checks
      const child1 = root1.children.find(c => c._id.toString() === childAccount1._id.toString());
      expect(child1).toBeDefined();
      expect(child1.debits).toBe(200);   // Direct debit from Inside range 2
      expect(child1.credits).toBe(50);  // Direct credit from Inside range 1
      expect(child1.totalDebits).toBe(200); // child1 debit + grandchild debits (0)
      expect(child1.totalCredits).toBe(50 + 75); // child1 credit + grandchild1 credit

      // Grandchild 1 checks
      const grandChild1 = child1.children.find(gc => gc._id.toString() === grandchildAccount1._id.toString());
      expect(grandChild1).toBeDefined();
      expect(grandChild1.debits).toBe(0);   // No direct debits in range
      expect(grandChild1.credits).toBe(75);  // Direct credit from Inside range 2
      expect(grandChild1.totalDebits).toBe(0);
      expect(grandChild1.totalCredits).toBe(75);
    });

    it('should handle circular references gracefully', async () => {
      // Create two accounts that reference each other
      const account1 = await Account.create({
        name: 'Account 1',
        type: 'asset',
        isActive: true,
        unit: 'USD'
      });

      const account2 = await Account.create({
        name: 'Account 2',
        type: 'asset',
        parent: account1._id,
        isActive: true,
        unit: 'USD'
      });

      // Try to create a circular reference (should fail)
      account1.parent = account2._id;
      await expect(account1.save()).rejects.toThrow();
    });
  });
}); 