/**
 * Seed script to create a set of accounts in the database.
 * Run with: node src/scripts/seedAccounts.js
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const logger = require('../config/logger');

// Load environment variables from the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import the Account model
const Account = require('../models/Account');
const connectDB = require('../config/database');

// Function to seed accounts
const seedAccounts = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    logger.info('Starting account seeding...');
    
    // Check if accounts already exist
    const accountCount = await Account.countDocuments();
    
    if (accountCount > 0) {
      logger.info(`Database already has ${accountCount} accounts. Clearing existing accounts...`);
      await Account.deleteMany({});
    }
    
    // Create parent accounts for different types
    const assetParent = await Account.create({
      name: 'Assets',
      type: 'asset',
      description: 'Parent account for all assets'
    });
    logger.info(`Created parent account: ${assetParent.name}`);

    const liabilityParent = await Account.create({
      name: 'Liabilities',
      type: 'liability',
      description: 'Parent account for all liabilities'
    });
    logger.info(`Created parent account: ${liabilityParent.name}`);

    const incomeParent = await Account.create({
      name: 'Income',
      type: 'income',
      description: 'Parent account for all income'
    });
    logger.info(`Created parent account: ${incomeParent.name}`);

    const expenseParent = await Account.create({
      name: 'Expenses',
      type: 'expense',
      description: 'Parent account for all expenses'
    });
    logger.info(`Created parent account: ${expenseParent.name}`);

    const equityParent = await Account.create({
      name: 'Equity',
      type: 'equity',
      description: 'Parent account for all equity'
    });
    logger.info(`Created parent account: ${equityParent.name}`);

    // Create some asset accounts
    const bankAccount = await Account.create({
      name: 'Bank Accounts',
      type: 'asset',
      description: 'All bank accounts',
      parent: assetParent._id
    });
    
    await Account.create({
      name: 'Checking Account',
      type: 'asset',
      description: 'Main checking account',
      parent: bankAccount._id
    });
    
    await Account.create({
      name: 'Savings Account',
      type: 'asset',
      description: 'Emergency fund',
      parent: bankAccount._id
    });
    
    await Account.create({
      name: 'Investment Accounts',
      type: 'asset',
      description: 'Investment accounts',
      parent: assetParent._id
    });
    
    // Create some liability accounts
    const creditCards = await Account.create({
      name: 'Credit Cards',
      type: 'liability',
      description: 'All credit card accounts',
      parent: liabilityParent._id
    });
    
    await Account.create({
      name: 'Visa Card',
      type: 'liability',
      description: 'Visa credit card',
      parent: creditCards._id
    });
    
    await Account.create({
      name: 'Mastercard',
      type: 'liability',
      description: 'Mastercard credit card',
      parent: creditCards._id
    });
    
    await Account.create({
      name: 'Mortgage',
      type: 'liability',
      description: 'Home mortgage',
      parent: liabilityParent._id
    });
    
    // Create some income accounts
    await Account.create({
      name: 'Salary',
      type: 'income',
      description: 'Employment income',
      parent: incomeParent._id
    });
    
    await Account.create({
      name: 'Interest Income',
      type: 'income',
      description: 'Interest from savings accounts',
      parent: incomeParent._id
    });
    
    await Account.create({
      name: 'Investment Income',
      type: 'income',
      description: 'Income from investments',
      parent: incomeParent._id
    });
    
    // Create some expense accounts
    await Account.create({
      name: 'Groceries',
      type: 'expense',
      description: 'Food and household supplies',
      parent: expenseParent._id
    });
    
    await Account.create({
      name: 'Utilities',
      type: 'expense',
      description: 'Electricity, water, gas, etc.',
      parent: expenseParent._id
    });
    
    await Account.create({
      name: 'Rent',
      type: 'expense',
      description: 'Monthly rent payment',
      parent: expenseParent._id
    });
    
    await Account.create({
      name: 'Transportation',
      type: 'expense',
      description: 'Gas, public transit, etc.',
      parent: expenseParent._id
    });
    
    // Create equity account
    await Account.create({
      name: 'Opening Balances',
      type: 'equity',
      description: 'For setting initial account balances',
      parent: equityParent._id
    });
    
    logger.info('Account seeding completed successfully!');

    // Count accounts by type
    const assetCount = await Account.countDocuments({ type: 'asset' });
    const liabilityCount = await Account.countDocuments({ type: 'liability' });
    const incomeCount = await Account.countDocuments({ type: 'income' });
    const expenseCount = await Account.countDocuments({ type: 'expense' });
    const equityCount = await Account.countDocuments({ type: 'equity' });
    
    logger.info(`Created ${assetCount} asset accounts, ${liabilityCount} liability accounts, ${incomeCount} income accounts, ${expenseCount} expense accounts, and ${equityCount} equity accounts.`);
    
    // Disconnect from the database
    await mongoose.disconnect();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error seeding accounts: ${error.message}`);
    process.exit(1);
  }
};

// Run the seed function
seedAccounts(); 