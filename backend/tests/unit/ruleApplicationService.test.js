const Rule = require('../../src/models/Rule');
const Transaction = require('../../src/models/Transaction');
const { applyRulesToTransaction } = require('../../src/services/ruleApplicationService');
const { setupDB } = require('../setup');
const Account = require('../../src/models/Account');

// Mock the controller functions
jest.mock('../../src/controllers/transactionController/suggestions', () => ({
  getSuggestedMatches: jest.fn().mockImplementation(async (req, res) => {
    res.json({
      success: true,
      data: {
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      }
    });
  })
}));

jest.mock('../../src/controllers/transactionController/restructure', () => ({
  mergeTransaction: jest.fn()
}));

// Setup test database
setupDB();

describe('Rule Application Service', () => {
  let assetAccount;
  let expenseAccount;
  let incomeAccount;
  
  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
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
  });

  describe('Edit Rules', () => {
    it('should apply edit rule to transaction description', async () => {
      // Create an edit rule
      const editRule = await Rule.create({
        name: 'Test Edit Rule',
        type: 'edit',
        pattern: 'GROCERY',
        newDescription: 'GROCERIES',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      // Create a transaction
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'GROCERY SHOPPING',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Apply the rule
      await applyRulesToTransaction(transaction._id);
      
      // Check the result
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.description).toBe('GROCERIES');
    });
    
    it('should apply edit rule with regex pattern', async () => {
      // Create an edit rule with regex pattern
      const editRule = await Rule.create({
        name: 'Test Regex Rule',
        type: 'edit',
        pattern: 'GROCERY.*\\$(\\d+)',
        newDescription: 'GROCERIES',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      // Create a transaction
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'GROCERY SHOPPING $1',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Apply the rule
      await applyRulesToTransaction(transaction._id);
      
      // Check the result
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.description).toBe('GROCERIES');
    });
  });

  describe('Merge Rules', () => {
    it('should merge transactions based on description pattern', async () => {
      // Create a merge rule
      const mergeRule = await Rule.create({
        name: 'Test Merge Rule',
        type: 'merge',
        pattern: 'GROCERY',
        maxDateDifference: 3,
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      // Create two transactions to merge
      const transaction1 = await Transaction.create({
        date: new Date(),
        description: 'GROCERY SHOPPING 1',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 50,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      const transaction2 = await Transaction.create({
        date: new Date(),
        description: 'GROCERY SHOPPING 2',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 50,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Apply the rule to both transactions
      await applyRulesToTransaction(transaction1._id);
      await applyRulesToTransaction(transaction2._id);
      
      // Check that one transaction was merged into the other
      const remainingTransactions = await Transaction.find({
        description: { $regex: 'GROCERY', $options: 'i' }
      });
      
      expect(remainingTransactions).toHaveLength(1);
      expect(remainingTransactions[0].entries).toHaveLength(2);
    });
  });

  describe('Complementary Rules', () => {
    it('should create complementary entries', async () => {
      // Create a complementary rule
      const complementaryRule = await Rule.create({
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
        ],
        autoApply: true
      });
      
      // Create a transaction with a source entry
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'Test Transaction',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Apply the rule
      await applyRulesToTransaction(transaction._id);
      
      // Check the result
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.entries).toHaveLength(3); // Original + 2 new entries
      
      // Verify the amounts
      const expenseEntry = updatedTransaction.entries.find(
        entry => entry.accountId.toString() === expenseAccount._id.toString()
      );
      const incomeEntry = updatedTransaction.entries.find(
        entry => entry.accountId.toString() === incomeAccount._id.toString()
      );
      
      expect(expenseEntry.amount).toBe(60); // 60% of 100
      expect(incomeEntry.amount).toBe(40); // 40% of 100
    });
  });

  describe('Rule Application Order', () => {
    it('should apply rules in priority order', async () => {
      // Create rules with different priorities
      const lowPriorityRule = await Rule.create({
        name: 'Low Priority Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'LOW TRANSACTION',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      const highPriorityRule = await Rule.create({
        name: 'High Priority Rule',
        type: 'edit',
        pattern: 'TEST',
        newDescription: 'HIGH TRANSACTION',
        sourceAccounts: [assetAccount._id],
        autoApply: true
      });
      
      // Create a transaction
      const transaction = await Transaction.create({
        date: new Date(),
        description: 'TEST TRANSACTION',
        entries: [
          {
            accountId: assetAccount._id,
            amount: 100,
            type: 'debit',
            unit: 'USD'
          }
        ]
      });
      
      // Apply the rules
      await applyRulesToTransaction(transaction._id);
      
      // Check the result - high priority rule should be applied last
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.description).toBe('HIGH TRANSACTION');
    });
  });
}); 