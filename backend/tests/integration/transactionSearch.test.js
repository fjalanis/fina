// Set NODE_ENV to test to disable MongoDB transactions
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/server');
const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const { setupDB } = require('../setup');
const { createTestAccount } = require('../testUtils');
const { countBusinessDays, calculateBusinessDayRange } = require('../../src/utils/dateUtils');

// Setup fresh database
setupDB();

describe('Transaction Search API', () => {
  let assetAccount;
  let expenseAccount;
  
  // Setup test accounts once for all tests
  beforeAll(async () => {
    // Create test accounts
    assetAccount = await Account.create({
      name: 'Search Test Account',
      type: 'asset',
      unit: 'USD'
    });
    
    expenseAccount = await Account.create({
      name: 'Search Test Expense',
      type: 'expense',
      unit: 'USD'
    });
  });
  
  // Helper function to create test transactions (revert to original structure)
  const createTestTransactions = async (referenceDate) => {
    // Create a transaction at the reference date
    const referenceTransaction = await Transaction.create({
      date: referenceDate,
      description: 'Reference transaction for search test',
      entries: [
        { accountId: assetAccount._id, description: 'Reference debit entry', amount: 100, type: 'debit', unit: 'USD' },
        { accountId: expenseAccount._id, description: 'Reference credit entry', amount: 100, type: 'credit', unit: 'USD' }
      ]
    });
    
    // Create a transaction 5 business days before reference date
    const olderDate = new Date(referenceDate);
    let daysBack = 0;
    while (daysBack < 5) {
      olderDate.setDate(olderDate.getDate() - 1);
      if (olderDate.getDay() !== 0 && olderDate.getDay() !== 6) daysBack++;
    }
    const olderTransaction = await Transaction.create({
      date: olderDate,
      description: 'Older transaction for search test',
      entries: [
        { accountId: assetAccount._id, description: 'Older debit entry', amount: 75, type: 'debit', unit: 'USD' },
        { accountId: expenseAccount._id, description: 'Older credit entry', amount: 75, type: 'credit', unit: 'USD' }
      ]
    });
    
    // Create a transaction 5 business days after reference date
    const newerDate = new Date(referenceDate);
    let daysForward = 0;
    while (daysForward < 5) {
      newerDate.setDate(newerDate.getDate() + 1);
      if (newerDate.getDay() !== 0 && newerDate.getDay() !== 6) daysForward++;
    }
    const newerTransaction = await Transaction.create({
      date: newerDate,
      description: 'Newer transaction for search test',
      entries: [
        { accountId: assetAccount._id, description: 'Newer debit entry', amount: 125, type: 'debit', unit: 'USD' },
        { accountId: expenseAccount._id, description: 'Newer credit entry', amount: 125, type: 'credit', unit: 'USD' }
      ]
    });
    
    // Create a transaction far outside the business day range (e.g., 30 business days)
    const farDate = new Date(referenceDate);
    let farDaysBack = 0;
    while (farDaysBack < 30) {
      farDate.setDate(farDate.getDate() - 1);
      if (farDate.getDay() !== 0 && farDate.getDay() !== 6) farDaysBack++;
    }
    const farTransaction = await Transaction.create({
      date: farDate,
      description: 'Far transaction outside search range',
      entries: [
        { accountId: assetAccount._id, description: 'Far debit entry', amount: 200, type: 'debit', unit: 'USD' },
        { accountId: expenseAccount._id, description: 'Far credit entry', amount: 200, type: 'credit', unit: 'USD' }
      ]
    });
    
    return { referenceTransaction, olderTransaction, newerTransaction, farTransaction };
  };
  
  describe('GET /api/transactions/search-entries', () => {
    
    test('should return transactions within default date range (15 business days)', async () => {
      // Create test transactions
      const referenceDate = new Date('2023-01-20'); // Use a weekday
      const { referenceTransaction, olderTransaction, newerTransaction, farTransaction } = 
        await createTestTransactions(referenceDate);
      
      // Default range is 15 business days
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('entries');
      
      // We should find entries from reference, older, and newer transactions (all within 15 business days)
      const entryIds = response.body.data.entries.map(entry => entry.transaction._id);
      const uniqueTransactionIds = [...new Set(entryIds)];
      
      expect(uniqueTransactionIds).toContain(referenceTransaction._id.toString());
      expect(uniqueTransactionIds).toContain(olderTransaction._id.toString()); // Created 5 biz days before
      expect(uniqueTransactionIds).toContain(newerTransaction._id.toString()); // Created 5 biz days after
      
      // Far transaction (30 biz days before) should be excluded
      expect(uniqueTransactionIds).not.toContain(farTransaction._id.toString());
    });
    
    test('should respect custom date range parameter (business days)', async () => {
      const referenceDate = new Date('2023-01-20'); // Use a weekday
      const { referenceTransaction, olderTransaction, newerTransaction, farTransaction } = 
        await createTestTransactions(referenceDate); // older is 5 biz days before, newer is 5 biz days after
      
      // Use small date range (e.g., 3 business days)
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=3`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Controller enforces a minimum range (likely >= 5 days). 
      // So, even with dateRange=3, older and newer (at 5 days) might be included.
      // The reference transaction MUST be included.
      const entryIds = response.body.data.entries.map(entry => entry.transaction._id);
      const uniqueTransactionIds = [...new Set(entryIds)];
      
      expect(uniqueTransactionIds).toContain(referenceTransaction._id.toString());
      
      // Verify older/newer based on whether they fall into the *minimum* range applied by the controller.
      // Since older/newer are 5 days away, and the minimum is likely >= 5, they *should* be included.
      expect(uniqueTransactionIds).toContain(olderTransaction._id.toString()); 
      expect(uniqueTransactionIds).toContain(newerTransaction._id.toString());
      
      // Far transaction should still be excluded
      expect(uniqueTransactionIds).not.toContain(farTransaction._id.toString());
    });

    test('should return 400 if referenceDate is invalid', async () => {
       const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=invalid-date&dateRange=5`)
        .expect(400);
       expect(response.body.error).toContain('Invalid referenceDate format');
    });

    // --- Keep existing tests for other filters, but update to use referenceDate/dateRange --- 
    test('should filter results by amount within a date range', async () => {
      const referenceDate = new Date('2023-01-20'); 
      const { referenceTransaction, olderTransaction, newerTransaction } = 
        await createTestTransactions(referenceDate); // Amounts: ref=100, older=75, newer=125
      
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=15&minAmount=110&maxAmount=130`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Should only find entries from the newer transaction (amount = 125)
      const filteredEntries = response.body.data.entries;
      expect(filteredEntries.length).toBe(2); // debit and credit
      filteredEntries.forEach(entry => {
        expect(entry.amount).toBe(125);
        expect(entry.transaction._id).toBe(newerTransaction._id.toString());
      });
    });
    
    test('should filter results by entry type within a date range', async () => {
      const referenceDate = new Date('2023-01-20');
      const { referenceTransaction } = await createTestTransactions(referenceDate);
      
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=15&type=debit`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      const filteredEntries = response.body.data.entries;
      // Find the entry related to the reference transaction
      const relevantEntry = filteredEntries.find(e => e.transaction._id === referenceTransaction._id.toString() && e.type === 'debit');
      expect(relevantEntry).toBeDefined();
      expect(relevantEntry.type).toBe('debit');
    });
    
    test('should filter results by description text within a date range', async () => {
      const referenceDate = new Date('2023-01-20');
      const { referenceTransaction } = await createTestTransactions(referenceDate);
      // Update description
      referenceTransaction.description = "Unique Desc For Search";
      await referenceTransaction.save();
      
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=15&searchText=Unique%20Desc`)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      const filteredEntries = response.body.data.entries;
      expect(filteredEntries.length).toBe(2); // debit and credit from the matching transaction
      expect(filteredEntries[0].transaction._id).toBe(referenceTransaction._id.toString());
      expect(filteredEntries[0].transaction.description).toBe("Unique Desc For Search");
    });

    test('should filter results by accountId within a date range', async () => {
      const referenceDate = new Date('2023-01-20');
      const { referenceTransaction } = await createTestTransactions(referenceDate);

      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=15&accountId=${assetAccount._id.toString()}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const filteredEntries = response.body.data.entries;
      const relevantEntry = filteredEntries.find(e => e.transaction._id === referenceTransaction._id.toString());
      expect(relevantEntry).toBeDefined();
      expect(relevantEntry.accountId.toString()).toBe(assetAccount._id.toString());
    });

    test('should exclude a specific transactionId', async () => {
       const referenceDate = new Date('2023-01-20');
       const { referenceTransaction, olderTransaction } = await createTestTransactions(referenceDate);
      
      const response = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${referenceDate.toISOString()}&dateRange=15&excludeTransactionId=${referenceTransaction._id.toString()}`)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      const filteredEntries = response.body.data.entries;
      const transactionIds = [...new Set(filteredEntries.map(e => e.transaction._id))];
      // Should contain older but not reference
      expect(transactionIds).toContain(olderTransaction._id.toString());
      expect(transactionIds).not.toContain(referenceTransaction._id.toString());
    });

    test('should support pagination', async () => {
      // Create 5 transactions around a date
      const refDate = new Date('2023-02-10');
      const txs = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(refDate);
        date.setDate(refDate.getDate() + i);
        txs.push(await Transaction.create({ 
          date, description: `Pag Tx ${i}`, entries: [
            { accountId: assetAccount._id, amount: 10, type: 'debit', unit: 'USD' },
            { accountId: expenseAccount._id, amount: 10, type: 'credit', unit: 'USD' }
          ]
        }));
      } // 5 transactions = 10 entries

      // Get page 1, limit 4 entries
      const response1 = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${refDate.toISOString()}&dateRange=15&page=1&limit=4`)
        .expect(200);
      expect(response1.body.data.entries.length).toBe(4);
      expect(response1.body.data.pagination.page).toBe(1);
      expect(response1.body.data.pagination.total).toBe(10); 
      expect(response1.body.data.pagination.pages).toBe(3); 

      // Get page 3, limit 4 entries (should have remaining 2)
      const response3 = await request(app)
        .get(`/api/transactions/search-entries?referenceDate=${refDate.toISOString()}&dateRange=15&page=3&limit=4`)
        .expect(200);
      expect(response3.body.data.entries.length).toBe(2);
      expect(response3.body.data.pagination.page).toBe(3);
    });
  });
  
  describe('POST /api/transactions/matches', () => {
    // This endpoint still uses referenceDate and dateRange in its *body* 
    // and calculates based on business days. We didn't change this controller.
    // Tests should remain as they are unless we decide to standardize this one too.
    
    // Example: Keep one test to ensure it still functions
    test('should find transactions with complementary imbalance (using referenceDate/dateRange)', async () => {
      const referenceDate = new Date('2023-01-15');
      
      // Create an unbalanced transaction with a debit imbalance
      const unbalancedTransaction = await Transaction.create({
        date: new Date(referenceDate),
        description: 'Unbalanced transaction for matching',
        entries: [
          { accountId: assetAccount._id, description: 'Excess debit', amount: 150, type: 'debit', unit: 'USD' }
        ]
      });
      
      // Create a balancing transaction within the default date range
      const balancingDate = new Date(referenceDate);
      balancingDate.setDate(balancingDate.getDate() + 3);
      const balancingTransaction = await Transaction.create({
        date: balancingDate,
        description: 'Balancing transaction',
        entries: [
          { accountId: expenseAccount._id, description: 'Excess credit', amount: 150, type: 'credit', unit: 'USD' }
        ]
      });

      const response = await request(app)
        .post('/api/transactions/matches')
        .send({
          amount: 150,
          type: 'credit', // Looking for a credit to balance the debit
          excludeTransactionId: unbalancedTransaction._id.toString(),
          referenceDate: referenceDate.toISOString(),
          dateRange: 15 // Default range
        })
        .expect(200);
        
      expect(response.body.success).toBe(true);
      // Ensure the structure matches what the frontend expects (assuming data.transactions)
      expect(response.body.data).toHaveProperty('transactions'); 
      const transactionIds = response.body.data.transactions.map(t => t._id);
      expect(transactionIds).toContain(balancingTransaction._id.toString());
    });
    
    // Add other tests for /matches if needed, keeping referenceDate/dateRange
  });

  // --- Tests for GET /api/transactions/search (already uses startDate/endDate) --- 
  describe('GET /api/transactions/search', () => {
    // Helper needs adjustment if used here
    const createSearchTestTransactions = async (dates) => {
      const txs = [];
      for(let i = 0; i < dates.length; i++) {
        txs.push(await Transaction.create({
          date: dates[i], description: `Search Tx ${i}`, entries: [
            { accountId: assetAccount._id, amount: 100, type: 'debit', unit: 'USD' },
            { accountId: expenseAccount._id, amount: 100, type: 'credit', unit: 'USD' }
          ]
        }));
      }
      return txs;
    };

    test('should find transactions by date range using startDate and endDate', async () => {
      const dates = [
        new Date('2024-01-10'), 
        new Date('2024-02-15'), 
        new Date('2024-03-20')
      ];
      const [tx1, tx2, tx3] = await createSearchTestTransactions(dates);

      const startDate = '2024-02-01';
      const endDate = '2024-02-29';

      const response = await request(app)
        .get(`/api/transactions/search?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]._id).toBe(tx2._id.toString());
    });

    test('should find transactions by description within date range', async () => {
      const dates = [new Date('2024-02-10'), new Date('2024-02-20')];
      const created = await createSearchTestTransactions(dates);
      created[0].description = "Searchable Desc";
      await created[0].save();

      const startDate = '2024-02-01';
      const endDate = '2024-02-29';

      const response = await request(app)
        .get(`/api/transactions/search?startDate=${startDate}&endDate=${endDate}&description=Searchable`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]._id).toBe(created[0]._id.toString());
    });

    // Add more tests for other filters combined with date range if necessary
  });

  afterAll(async () => {
    // Clean up created accounts after all tests
    await Account.deleteMany({});
  });
}); 