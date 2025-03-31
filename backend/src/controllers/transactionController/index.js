// Transaction controller index
// Re-exports all transaction controller functionality

// Import all controller modules
const coreController = require('./core');
const entryLinesController = require('./entryLines');
const searchController = require('./search');
const suggestionsController = require('./suggestions');
const restructureController = require('./restructure');

// Re-export all functionality
module.exports = {
  // Core transaction operations
  createTransaction: coreController.createTransaction,
  getTransactions: coreController.getTransactions,
  getTransaction: coreController.getTransaction,
  updateTransaction: coreController.updateTransaction,
  deleteTransaction: coreController.deleteTransaction,
  
  // EntryLine operations
  addEntryLine: entryLinesController.addEntryLine,
  updateEntryLine: entryLinesController.updateEntryLine,
  deleteEntryLine: entryLinesController.deleteEntryLine,
  
  // Analysis operations
  searchEntries: searchController.searchEntries,
  getSuggestedMatches: suggestionsController.getSuggestedMatches,
  
  // Restructure operations
  extractEntry: restructureController.extractEntry,
  mergeTransaction: restructureController.mergeTransaction
}; 