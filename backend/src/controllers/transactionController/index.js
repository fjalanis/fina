// Transaction controller index

// Import all controller modules
const { moveEntry, mergeTransaction, splitTransaction } = require('./restructure');
const { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction } = require('./core');
const { searchEntries, searchTransactions } = require('./search');
const { getSuggestedMatches } = require('./suggestions')

// Re-export all functionality
module.exports = {
  // Core transaction operations
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  
  // Analysis operations
  searchEntries,
  searchTransactions,
  
  // Restructure operations
  moveEntry,
  mergeTransaction,
  splitTransaction,

  getSuggestedMatches,

}; 