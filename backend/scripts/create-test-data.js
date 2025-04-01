const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const Account = require('../src/models/Account');

async function createTestData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/household-finance');
    console.log('Connected to database');
    
    // Find an income and expense account
    const incomeAccounts = await Account.find({ type: 'income' }).limit(1);
    const expenseAccounts = await Account.find({ type: 'expense' }).limit(1);
    const assetAccounts = await Account.find({ type: 'asset' }).limit(1);
    
    if (incomeAccounts.length === 0 || expenseAccounts.length === 0 || assetAccounts.length === 0) {
      console.error('Could not find required accounts. Please create income, expense and asset accounts first.');
      process.exit(1);
    }
    
    const incomeAccount = incomeAccounts[0];
    const expenseAccount = expenseAccounts[0];
    const assetAccount = assetAccounts[0];
    
    console.log('Using accounts:', {
      income: incomeAccount.name,
      expense: expenseAccount.name,
      asset: assetAccount.name
    });
    
    // Create income transaction
    await Transaction.create({
      date: new Date('2025-04-10'),
      description: 'April 2025 Income',
      entries: [
        {
          account: incomeAccount._id,
          amount: 3000,
          type: 'credit'
        },
        {
          account: assetAccount._id,
          amount: 3000,
          type: 'debit'
        }
      ]
    });
    
    // Create expense transaction
    await Transaction.create({
      date: new Date('2025-04-15'),
      description: 'April 2025 Expense',
      entries: [
        {
          account: expenseAccount._id,
          amount: 1200,
          type: 'debit'
        },
        {
          account: assetAccount._id,
          amount: 1200,
          type: 'credit'
        }
      ]
    });
    
    console.log('Created test transactions for April 2025');
    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData(); 