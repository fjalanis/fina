const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('../config/database');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Rule = require('../models/Rule');
const axios = require('axios');

// Load environment variables
console.log('Loading environment variables...');
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Env path:', envPath);
dotenv.config({ path: envPath });
console.log('MONGO_URI:', process.env.MONGO_URI);

// Test data
const testAccounts = [
  {
    name: 'Checking Account',
    type: 'asset',
    description: 'Main checking account',
    isActive: true
  },
  {
    name: 'Credit Card',
    type: 'liability',
    description: 'Main credit card',
    isActive: true
  },
  {
    name: 'Groceries',
    type: 'expense',
    description: 'Grocery expenses',
    isActive: true
  },
  {
    name: 'Dining Out',
    type: 'expense',
    description: 'Restaurant expenses',
    isActive: true
  },
  {
    name: 'Utilities',
    type: 'expense',
    description: 'Utility bills',
    isActive: true
  },
  {
    name: 'Salary',
    type: 'income',
    description: 'Monthly salary',
    isActive: true
  }
];

// Function to create test transactions
const createTestTransactions = async (accounts) => {
  // Get account IDs
  const checkingAccount = accounts.find(a => a.name === 'Checking Account')._id;
  const creditCard = accounts.find(a => a.name === 'Credit Card')._id;
  
  // Create unbalanced transactions
  const transactions = [
    {
      description: 'Grocery shopping at Whole Foods',
      date: new Date(),
      entries: [
        {
          account: creditCard,
          amount: 150.75,
          description: 'Weekly grocery shopping',
          type: 'debit'
        }
      ]
    },
    {
      description: 'Dinner at Italian Restaurant',
      date: new Date(),
      entries: [
        {
          account: creditCard,
          amount: 78.50,
          description: 'Dinner with family',
          type: 'debit'
        }
      ]
    },
    {
      description: 'Electric bill payment',
      date: new Date(),
      entries: [
        {
          account: checkingAccount,
          amount: 120.30,
          description: 'Electric bill for March',
          type: 'credit'
        }
      ]
    },
    {
      description: 'Paycheck deposit',
      date: new Date(),
      entries: [
        {
          account: checkingAccount,
          amount: 3000.00,
          description: 'Monthly salary',
          type: 'debit'
        }
      ]
    }
  ];

  // Save all transactions
  for (const txnData of transactions) {
    const transaction = new Transaction(txnData);
    await transaction.save();
    console.log(`Created transaction: ${transaction.description}`);
  }
};

// Function to create test rules
const createTestRules = async (accounts) => {
  // Get account IDs
  const checkingAccount = accounts.find(a => a.name === 'Checking Account')._id;
  const creditCard = accounts.find(a => a.name === 'Credit Card')._id;
  const groceries = accounts.find(a => a.name === 'Groceries')._id;
  const diningOut = accounts.find(a => a.name === 'Dining Out')._id;
  const utilities = accounts.find(a => a.name === 'Utilities')._id;
  const salary = accounts.find(a => a.name === 'Salary')._id;
  
  // Create rules
  const rules = [
    {
      name: 'Grocery Rule',
      description: 'Match grocery expenses and categorize appropriately',
      pattern: '(grocery|groceries|whole foods|trader joes|safeway|market)',
      sourceAccount: creditCard,
      destinationAccounts: [
        {
          accountId: groceries,
          ratio: 1
        }
      ],
      priority: 10,
      isEnabled: true
    },
    {
      name: 'Restaurant Rule',
      description: 'Match restaurant expenses and categorize appropriately',
      pattern: '(restaurant|dinner|lunch|cafe|bistro)',
      sourceAccount: creditCard,
      destinationAccounts: [
        {
          accountId: diningOut,
          ratio: 1
        }
      ],
      priority: 20,
      isEnabled: true
    },
    {
      name: 'Utility Bill Rule',
      description: 'Match utility payments and categorize appropriately',
      pattern: '(electric|utility|water|gas|bill)',
      sourceAccount: checkingAccount,
      destinationAccounts: [
        {
          accountId: utilities,
          ratio: 1
        }
      ],
      priority: 30,
      isEnabled: true
    },
    {
      name: 'Salary Rule',
      description: 'Match paycheck deposits and categorize appropriately',
      pattern: '(salary|paycheck|deposit)',
      sourceAccount: checkingAccount,
      destinationAccounts: [
        {
          accountId: salary,
          ratio: 1
        }
      ],
      priority: 40,
      isEnabled: true
    }
  ];
  
  // Save rules
  for (const ruleData of rules) {
    const rule = new Rule(ruleData);
    await rule.save();
    console.log(`Created rule: ${rule.name}`);
  }
};

// Function to clean all data from the database
const cleanDatabase = async () => {
  console.log('Cleaning database...');
  
  // Use deleteMany to remove all documents from each collection
  const deleteRules = Rule.deleteMany({});
  const deleteTransactions = Transaction.deleteMany({});
  const deleteAccounts = Account.deleteMany({});
  
  // Run all delete operations in parallel
  await Promise.all([deleteRules, deleteTransactions, deleteAccounts]);
  
  console.log('All existing data removed from database');
};

// Main function
const createTestData = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB database');
    
    // Clean existing data first
    await cleanDatabase();
    
    // Create accounts
    let accounts = [];
    for (const accountData of testAccounts) {
      const account = new Account(accountData);
      await account.save();
      console.log(`Created account: ${account.name}`);
      accounts.push(account);
    }
    
    // Create test transactions
    await createTestTransactions(accounts);
    
    // Create test rules
    await createTestRules(accounts);
    
    console.log('Test data created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
};

// Run the script
createTestData(); 