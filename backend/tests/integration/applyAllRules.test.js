const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/server');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');

// This test needs to run on its own to avoid database conflicts
describe('Apply Rules to All Transactions', () => {
  let testAccount;
  let expenseAccount;
  let assetAccount;
  let incomeAccount;

  beforeAll(async () => {
    // Connect to the test database
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear any existing data
    await Promise.all([
      Account.deleteMany({}),
      Transaction.deleteMany({}),
      Rule.deleteMany({})
    ]);
    
    // Create test accounts
    testAccount = await Account.create({
      name: 'Test Account',
      type: 'asset',
      subtype: 'checking',
      institution: 'Test Bank',
      isHidden: false,
      unit: 'USD'
    });
    console.log(`Created test account: ${testAccount._id}`);

    expenseAccount = await Account.create({
      name: 'Expense Account',
      type: 'expense',
      subtype: 'general',
      institution: 'None',
      isHidden: false,
      unit: 'USD'
    });
    console.log(`Created expense account: ${expenseAccount._id}`);

    assetAccount = await Account.create({ name: 'Bank Account', type: 'asset', unit: 'USD' });
    incomeAccount = await Account.create({ name: 'Salary', type: 'income', unit: 'USD' });
  });

  afterAll(async () => {
    // Clean up
    await Promise.all([
      Account.deleteMany({}),
      Transaction.deleteMany({}),
      Rule.deleteMany({})
    ]);
    
    // Disconnect from the database
    await mongoose.disconnect();
  });

  it('should apply rules to all unbalanced transactions', async () => {
    // Create a rule to match transactions with "Bulk" in the description
    const rule = await Rule.create({
      name: 'Bulk Transaction Rule',
      pattern: 'Bulk',
      ignoreCase: true,
      newDescription: 'EDITED',
      sourceAccounts: [testAccount._id],
      targetAccount: expenseAccount._id,
      autoApply: true,
      lastApplied: null,
      type: 'edit',
      unit: 'USD'
    });
    console.log(`Created rule: ${rule._id}`);

    // Create unbalanced transactions (entries don't sum to zero)
    const unbalancedTransactions = [];
    
    // Transaction 1 - Should match the rule
    const transaction1 = await Transaction.create({
      date: new Date(),
      description: 'Bulk Transaction 1',
      entries: [
        {
          accountId: testAccount._id,
          amount: 100,
          memo: 'Test debit',
          type: 'debit',
          unit: 'USD'
        }
      ]
    });
    unbalancedTransactions.push(transaction1);
    console.log(`Created transaction 1: ${transaction1._id}`);
    
    // Transaction 2 - Should match the rule
    const transaction2 = await Transaction.create({
      date: new Date(),
      description: 'Bulk Transaction 2',
      entries: [
        {
          accountId: testAccount._id,
          amount: 50,
          memo: 'Test debit',
          type: 'debit',
          unit: 'USD'
        }
      ]
    });
    unbalancedTransactions.push(transaction2);
    console.log(`Created transaction 2: ${transaction2._id}`);
    
    // Transaction 3 - Should NOT match the rule
    const transaction3 = await Transaction.create({
      date: new Date(),
      description: 'Other Transaction',
      entries: [
        {
          accountId: testAccount._id,
          amount: 75,
          memo: 'Test debit',
          type: 'debit',
          unit: 'USD'
        }
      ]
    });
    unbalancedTransactions.push(transaction3);
    console.log(`Created transaction 3: ${transaction3._id}`);

    // Verify the transactions are saved and unbalanced
    for (const tx of unbalancedTransactions) {
      const savedTx = await Transaction.findById(tx._id).populate('entries.account');
      console.log(`Transaction ${tx.description} isBalanced: ${savedTx.isBalanced}`);
      expect(savedTx.isBalanced).toBe(false);
    }

    // Call the apply-all endpoint
    const response = await request(app)
      .post('/api/rules/apply-all')
      .expect(200);

    console.log('Apply-all response:', JSON.stringify(response.body, null, 2));
    
    // Verify the response has the right structure
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.successful).toBeGreaterThan(0);
    
    // Verify that the transactions were updated correctly
    const updatedTransaction1 = await Transaction.findById(transaction1._id);
    const updatedTransaction2 = await Transaction.findById(transaction2._id);
    const updatedTransaction3 = await Transaction.findById(transaction3._id);
    
    // The matching transactions should have updated descriptions
    expect(updatedTransaction1.description).toBe('EDITED');
    expect(updatedTransaction2.description).toBe('EDITED');
    
    // The non-matching transaction should remain unchanged
    expect(updatedTransaction3.description).toBe('Other Transaction');
  });
}); 