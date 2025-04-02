const mongoose = require('mongoose');
const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const { applyRulesToTransaction } = require('../../src/services/ruleApplicationService');
const { setupDB } = require('../setup');
const Account = require('../../src/models/Account');

// Setup test database
setupDB();

describe('Rule Entry Type Filtering', () => {
  let assetAccount;
  let expenseAccount;
  let incomeAccount;
  let otherAssetAccount;
  
  beforeEach(async () => {
    // Clear the database
    await Promise.all([
      Transaction.deleteMany({}),
      Rule.deleteMany({}),
      Account.deleteMany({})
    ]);
    
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Bank Account',
      type: 'asset',
      unit: 'USD'
    });
    
    expenseAccount = await Account.create({
      name: 'Groceries',
      type: 'expense',
      unit: 'USD'
    });
    
    incomeAccount = await Account.create({
      name: 'Salary',
      type: 'income',
      unit: 'USD'
    });
    
    otherAssetAccount = await Account.create({
      name: 'Other Asset',
      type: 'asset',
      unit: 'USD'
    });
  });

  it('should apply rule when entryType is "both"', async () => {
    // Create an edit rule with entryType "both"
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],
      entryType: 'both', // Default value
      autoApply: true
    });
    
    // Create a transaction with debit entry
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [{
        accountId: assetAccount._id,
        amount: 100,
        type: 'debit',
        unit: 'USD'
      }]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('EDITED');
  });
  
  it('should apply rule when entryType matches transaction entries', async () => {
    // Create an edit rule with entryType "debit"
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],
      entryType: 'debit',
      autoApply: true
    });
    
    // Create a transaction with debit entry
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [{
        accountId: assetAccount._id,
        amount: 100,
        type: 'debit',
        unit: 'USD'
      }]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('EDITED');
  });
  
  it('should not apply rule when entryType does not match transaction entries', async () => {
    // Create an edit rule with entryType "credit"
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],
      entryType: 'credit',
      autoApply: true
    });
    
    // Create a transaction with debit entry
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [{
        accountId: assetAccount._id,
        amount: 100,
        type: 'debit', // This doesn't match the rule's entryType
        unit: 'USD' // Add unit
      }]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result - description should remain unchanged
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('TEST TRANSACTION');
  });
  
  it('should apply rule to mixed-type transactions when appropriate', async () => {
    // Create an edit rule with entryType "credit"
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],
      entryType: 'credit',
      autoApply: true
    });
    
    // Create a transaction with both debit and credit entries
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [
        {
          accountId: expenseAccount._id, // Different account
          amount: 100,
          type: 'debit',
          unit: 'USD' // Add unit
        },
        {
          accountId: assetAccount._id, // This matches the rule's sourceAccount
          amount: 100,
          type: 'credit',
          unit: 'USD' // Add unit
        }
      ]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result - rule should apply because transaction has a matching credit entry on the correct account
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('EDITED');
  });
  
  it('should respect both entryType and sourceAccount filters', async () => {
    // Create an edit rule with entryType "credit" and specific sourceAccount
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],  // Use the asset account
      entryType: 'credit',
      autoApply: true
    });
    
    // Create a transaction with matching description but wrong entry type
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [{
        accountId: assetAccount._id,  // Correct account
        amount: 100,
        type: 'debit',  // Wrong entry type
        unit: 'USD'
      }]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result - description should remain unchanged
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('TEST TRANSACTION');
  });
  
  it('should apply rule when both entryType and sourceAccount match', async () => {
    // Create an edit rule with entryType "credit" and specific sourceAccount
    const rule = await Rule.create({
      name: 'Test Rule',
      type: 'edit',
      pattern: 'TEST',
      newDescription: 'EDITED',
      sourceAccounts: [assetAccount._id],  // Use the asset account
      entryType: 'credit',
      autoApply: true
    });
    
    // Create a transaction with both matching account and entry type
    const transaction = await Transaction.create({
      date: new Date(),
      description: 'TEST TRANSACTION',
      entries: [{
        accountId: assetAccount._id,  // Correct account
        amount: 100,
        type: 'credit',  // Correct entry type
        unit: 'USD'
      }]
    });
    
    // Apply the rule
    await applyRulesToTransaction(transaction._id);
    
    // Check the result - description should be updated
    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.description).toBe('EDITED');
  });
}); 